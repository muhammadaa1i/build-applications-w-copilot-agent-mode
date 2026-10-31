import { Activity, Team, User, Workout } from '../models/index.js';

type HttpError = Error & { status: number };

function httpError(status: number, message: string): HttpError {
  return Object.assign(new Error(message), { status });
}

const objectIdPattern = /^[0-9a-f]{24}$/i;

function isObjectId(value: unknown): value is string {
  return typeof value === 'string' && objectIdPattern.test(value);
}

function requireText(value: unknown, field: string) {
  if (typeof value !== 'string' || value.trim() === '') throw httpError(400, `${field} is required`);
  return value.trim();
}

function requireObject(input: unknown) {
  if (typeof input !== 'object' || input === null || Array.isArray(input)) throw httpError(400, 'Request body must be a JSON object');
  return input as Record<string, unknown>;
}

// Activity types grouped by the kind of workout they build toward.
const focusByActivityType: Record<string, string> = {
  run: 'endurance',
  walk: 'endurance',
  cycle: 'endurance',
  swim: 'endurance',
  row: 'endurance',
  strength: 'strength',
  lift: 'strength',
  weights: 'strength',
  yoga: 'mobility',
  stretch: 'mobility',
  pilates: 'mobility',
};

const recentActivityLimit = 10;

export function pointsFor(minutes: number) {
  return Math.round(minutes);
}

export async function listActivities() {
  return Activity.find().sort({ occurredAt: -1 }).lean();
}

export async function createActivity(input: unknown) {
  const body = requireObject(input);
  const type = requireText(body.type, 'type');
  const { userId, teamId, minutes } = body;
  if (!isObjectId(userId)) throw httpError(400, 'userId must be a valid id');
  if (!isObjectId(teamId)) throw httpError(400, 'teamId must be a valid id');
  if (typeof minutes !== 'number' || !Number.isFinite(minutes) || minutes <= 0) throw httpError(400, 'minutes must be a positive number');

  const [user, team] = await Promise.all([User.exists({ _id: userId }), Team.exists({ _id: teamId })]);
  if (!user) throw httpError(404, 'User not found');
  if (!team) throw httpError(404, 'Team not found');

  const activity = await Activity.create({
    user: userId,
    team: teamId,
    type,
    minutes,
    points: pointsFor(minutes),
    occurredAt: new Date(),
  });
  return activity.toObject();
}

export async function listTeams() {
  return Team.find().lean();
}

export async function createTeam(input: unknown) {
  const body = requireObject(input);
  const name = requireText(body.name, 'name');
  const mascot = requireText(body.mascot, 'mascot');
  const members = body.members ?? [];
  if (!Array.isArray(members) || !members.every(isObjectId)) throw httpError(400, 'members must be a list of valid user ids');

  const uniqueMembers = [...new Set(members)];
  const found = await User.countDocuments({ _id: { $in: uniqueMembers } });
  if (found !== uniqueMembers.length) throw httpError(400, 'members must all be existing users');

  const team = await Team.create({ name, mascot, members: uniqueMembers });
  return team.toObject();
}

export async function getLeaderboard() {
  const [teams, totals] = await Promise.all([
    Team.find().select('name').lean(),
    Activity.aggregate<{ _id: unknown; totalPoints: number }>([{ $group: { _id: '$team', totalPoints: { $sum: '$points' } } }]),
  ]);
  const pointsByTeam = new Map(totals.map((total) => [String(total._id), total.totalPoints]));
  return teams
    .map((team) => ({ teamId: team._id, teamName: team.name, totalPoints: pointsByTeam.get(String(team._id)) ?? 0 }))
    .sort((a, b) => b.totalPoints - a.totalPoints || a.teamName.localeCompare(b.teamName))
    .map((entry, index) => ({ ...entry, rank: index + 1 }));
}

export async function suggestWorkouts(userEmail: string) {
  const email = userEmail.trim().toLowerCase();
  const user = await User.findOne({ email }).lean();
  if (!user) throw httpError(404, 'No user found for that email');

  const recent = await Activity.find({ user: user._id }).sort({ occurredAt: -1 }).limit(recentActivityLimit).lean();
  const minutesByFocus = new Map<string, number>();
  const lastTypeByFocus = new Map<string, string>();
  for (const activity of recent) {
    const focus = focusByActivityType[activity.type.toLowerCase()];
    if (!focus) continue;
    minutesByFocus.set(focus, (minutesByFocus.get(focus) ?? 0) + activity.minutes);
    if (!lastTypeByFocus.has(focus)) lastTypeByFocus.set(focus, activity.type);
  }
  const activityFocus = [...minutesByFocus.entries()].sort((a, b) => b[1] - a[1])[0]?.[0];
  const goalFocus = user.fitnessGoal.toLowerCase();
  const primaryFocus = activityFocus ?? goalFocus;

  const reasonFor = (focus: string) => {
    if (focus === activityFocus) return `Based on your recent ${lastTypeByFocus.get(focus)} activity, this builds ${focus}.`;
    if (focus === goalFocus) return `Matches your ${goalFocus} fitness goal.`;
    return `A balanced option to complement your ${primaryFocus} training.`;
  };
  const rank = (focus: string) => (focus === primaryFocus ? 0 : focus === goalFocus ? 1 : 2);

  const workouts = await Workout.find().lean();
  return workouts
    .map((workout) => ({ ...workout, reason: reasonFor(workout.focus.toLowerCase()) }))
    .sort((a, b) => rank(a.focus.toLowerCase()) - rank(b.focus.toLowerCase()));
}

export { User };
