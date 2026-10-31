import { useEffect, useState } from 'react';
import { getJson } from '../api/client.js';
import { ApiStateView, errorState, loadingState, type ApiState } from './ApiState.js';

type Team = { _id?: string; name: string; mascot?: string; members: string[] };

export default function Teams() {
  const [state, setState] = useState<ApiState<Team[]>>(loadingState);

  useEffect(() => {
    let active = true;
    getJson<{ teams: Team[] }>('/api/teams')
      .then((body) => active && setState({ status: 'ready', data: body.teams }))
      .catch((error) => active && setState(errorState(error)));
    return () => { active = false; };
  }, []);

  return (
    <section aria-labelledby="teams-heading">
      <h2 id="teams-heading" className="h4">Teams</h2>
      <ApiStateView state={state} label="teams" isEmpty={(items) => items.length === 0} emptyMessage="No teams have been created yet.">
        {(items) => (
          <ul className="list-group">
            {items.map((team, index) => (
              <li key={team._id ?? index} className="list-group-item d-flex justify-content-between align-items-center">
                <span>{team.name}{team.mascot ? ` (${team.mascot})` : ''}</span>
                <span className="badge text-bg-secondary">{team.members.length} {team.members.length === 1 ? 'member' : 'members'}</span>
              </li>
            ))}
          </ul>
        )}
      </ApiStateView>
    </section>
  );
}
