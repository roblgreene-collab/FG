# Working agreement for this repo

- The user is the **game designer**; Claude writes the code and offers suggestions when asked.
- `DESIGN.md` is the source of truth. Read it before every change.
- Never change, drop, or reinterpret a **Locked** rule without the designer's explicit approval.
  If a request conflicts with a Locked rule, point out the conflict (by rule ID) and ask before proceeding.
- When the designer approves a new or changed rule, update `DESIGN.md` (rules table + Change Log) in the same commit as the code.
- Tunable numbers live in a single config object in code and are mirrored in `DESIGN.md` §4.
- Suggestions from Claude go into the Parking Lot until the designer accepts them.
