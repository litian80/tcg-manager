# Spec 004: Advanced TDF Configuration

## Context
The current `.tdf` export generates a basic Tournament Operations Manager compatible file. However, larger tournaments or official events need specific categorization (e.g., Premier events) and strict birth-year division validations (Juniors, Seniors, Masters).

## Requirements
- **Tournament Categories**: Allow organizers to designate if a tournament is a "Premier" event, League Cup, Challenge, etc., prior to export.
- **Age Division Validation**: The system must warn (or block) the export if registered players are missing birth years, as TOM requires this to place them in the correct age division.
- **Staff Injection**: Ensure Judges and Organizers are correctly formatted as staff entities inside the XML structure.

## Technical Implementation Notes
- **UI Updates**: Expand the `TournamentSettingsForm` or the `TdfExportCard` to include specific dropdowns for TOM-required metadata.
- **Warning System**: When the user clicks "Export TDF", run a pre-flight check. If players have `birth_year = null`, show a modal listing the offending players so the organizer can fix them before exporting.
- **XML Generation Updates**: Modify the `export-tdf.ts` logic to correctly format divisions and inject the new metadata tags required by newer TOM versions.

## Acceptance Criteria
- [ ] Exporting a tournament with players missing birth years triggers a specific UI warning.
- [ ] TDF output includes corrected metadata tags for Premier/Event type.
- [ ] Staff members associated with the tournament are successfully mapped into the resulting XML.
