import { useEffect, useState, type FormEvent } from 'react';
import { getJson } from '../api/client.js';
import { ApiStateView, errorState, loadingState, type ApiState } from './ApiState.js';

type Suggestion = { _id?: string; title: string; focus?: string; minutes?: number; difficulty?: string; reason: string };

// A seeded demo user, so the view shows suggestions before anyone types an address.
const defaultEmail = 'mona@example.com';

export default function Workouts() {
  const [draft, setDraft] = useState(defaultEmail);
  const [email, setEmail] = useState(defaultEmail);
  const [state, setState] = useState<ApiState<Suggestion[]>>(loadingState);

  useEffect(() => {
    let active = true;
    setState(loadingState);
    getJson<{ suggestions: Suggestion[] }>(`/api/workouts/suggestions/${encodeURIComponent(email)}`)
      .then((body) => active && setState({ status: 'ready', data: body.suggestions }))
      .catch((error) => active && setState(errorState(error)));
    return () => { active = false; };
  }, [email]);

  function submit(event: FormEvent) {
    event.preventDefault();
    if (draft.trim()) setEmail(draft.trim());
  }

  return (
    <section aria-labelledby="workouts-heading">
      <h2 id="workouts-heading" className="h4">Workout suggestions</h2>
      <form className="row g-2 mb-3" onSubmit={submit}>
        <div className="col-auto">
          <label htmlFor="suggestion-email" className="visually-hidden">User email</label>
          <input id="suggestion-email" type="email" className="form-control" value={draft} onChange={(event) => setDraft(event.target.value)} required />
        </div>
        <div className="col-auto"><button type="submit" className="btn btn-primary">Get suggestions</button></div>
      </form>
      <ApiStateView state={state} label="workout suggestions" isEmpty={(items) => items.length === 0} emptyMessage="No workout suggestions are available for this user yet.">
        {(items) => (
          <ul className="list-group">
            {items.map((suggestion, index) => (
              <li key={suggestion._id ?? index} className="list-group-item">
                <strong>{suggestion.title}</strong>
                <div className="text-muted">{suggestion.reason}</div>
              </li>
            ))}
          </ul>
        )}
      </ApiStateView>
    </section>
  );
}
