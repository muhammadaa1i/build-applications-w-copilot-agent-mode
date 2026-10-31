import { useEffect, useState } from 'react';
import { getJson } from '../api/client.js';
import { ApiStateView, errorState, loadingState, type ApiState } from './ApiState.js';

type Activity = { _id?: string; type: string; minutes: number; points: number; occurredAt?: string };

export default function Activities() {
  const [state, setState] = useState<ApiState<Activity[]>>(loadingState);

  useEffect(() => {
    let active = true;
    getJson<{ activities: Activity[] }>('/api/activities')
      .then((body) => active && setState({ status: 'ready', data: body.activities }))
      .catch((error) => active && setState(errorState(error)));
    return () => { active = false; };
  }, []);

  return (
    <section aria-labelledby="activities-heading">
      <h2 id="activities-heading" className="h4">Activities</h2>
      <ApiStateView state={state} label="activities" isEmpty={(items) => items.length === 0} emptyMessage="No activities have been logged yet.">
        {(items) => (
          <table className="table">
            <thead><tr><th scope="col">Type</th><th scope="col">Minutes</th><th scope="col">Points</th><th scope="col">Logged</th></tr></thead>
            <tbody>
              {items.map((activity, index) => (
                <tr key={activity._id ?? index}>
                  <td>{activity.type}</td>
                  <td>{activity.minutes}</td>
                  <td>{activity.points}</td>
                  <td>{activity.occurredAt ? new Date(activity.occurredAt).toLocaleDateString() : ''}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </ApiStateView>
    </section>
  );
}
