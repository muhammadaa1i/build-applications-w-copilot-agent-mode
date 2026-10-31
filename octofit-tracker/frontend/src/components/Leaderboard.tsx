import { useEffect, useState } from 'react';
import { getJson } from '../api/client.js';
import { ApiStateView, errorState, loadingState, type ApiState } from './ApiState.js';

type Entry = { teamId?: string; teamName: string; totalPoints: number; rank: number };

export default function Leaderboard() {
  const [state, setState] = useState<ApiState<Entry[]>>(loadingState);

  useEffect(() => {
    let active = true;
    getJson<{ leaderboard: Entry[] }>('/api/leaderboard')
      .then((body) => active && setState({ status: 'ready', data: body.leaderboard }))
      .catch((error) => active && setState(errorState(error)));
    return () => { active = false; };
  }, []);

  return (
    <section aria-labelledby="leaderboard-heading">
      <h2 id="leaderboard-heading" className="h4">Leaderboard</h2>
      <ApiStateView state={state} label="leaderboard" isEmpty={(items) => items.length === 0} emptyMessage="No rankings are available yet.">
        {(items) => (
          <table className="table">
            <thead><tr><th scope="col">Rank</th><th scope="col">Team</th><th scope="col">Points</th></tr></thead>
            <tbody>
              {items.map((entry) => (
                <tr key={entry.teamId ?? entry.teamName}>
                  <td>{entry.rank}</td>
                  <td>{entry.teamName}</td>
                  <td>{entry.totalPoints}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </ApiStateView>
    </section>
  );
}
