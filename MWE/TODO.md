# TODO: Implement Project-Based Card Layout for Admin Dashboard

## Backend Changes (app.py)
- [x] Add project_id field to sentence documents in bulk-upload endpoint (default to 'default_project' if not provided)
- [x] Add project_id field to sentence documents in add-sentence endpoint (default to 'default_project' if not provided)
- [x] Create /projects endpoint that returns list of projects with aggregated sentence stats (total_sentences, annotated_sentences, non_annotated_sentences, creation_date)

## Frontend Changes (AdminDashboard.js)
- [x] Replace /stats fetch with /projects fetch
- [x] Update state to handle projects array instead of global stats
- [x] Change card layout to display project cards: project name, total sentences, annotated/unannotated counts, creation date
- [x] Ensure ActivityLogbook component remains at the bottom

## Testing
- [ ] Test backend /projects endpoint for correct data aggregation
- [ ] Verify frontend displays project cards correctly
- [ ] Ensure ActivityLogbook remains functional
