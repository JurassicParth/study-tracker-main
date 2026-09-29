# Study Tracker Dashboard

A single-page dashboard to log and visualize study sessions. Built with HTML, CSS and vanilla JavaScript. No frameworks or build step.

## Features

- Subjects with color tags. Add, edit and delete them from the sidebar.
- Click a subject to filter the session list.
- Log sessions with quick duration buttons (25m, 45m, 1h, 1h 30m, 2h). The last used subject is remembered.
- Daily goal with a progress bar (editable on the Today card).
- Stats for today, the last 7 days, all time and session count.
- Bar chart of hours per subject with a 7 or 30 day toggle. Hover a bar for details.
- 12-week consistency grid with day labels and a legend.
- Streak counter.
- Pomodoro timer that logs finished focus rounds, shows the time in the tab title, plays a sound and starts a break.
- Edit any logged session (subject, duration or date).
- Weekly goal per subject (Monday to Sunday), with a progress bar in the sidebar.
- Save a JSON backup and restore it later, for example on another browser or device.
- Undo after deleting a session.
- Export sessions as CSV.
- Shortcuts: `N` opens the log form, `Esc` closes any dialog.
- Data is saved in `localStorage`.

## Project structure

```
study-tracker/
├── index.html
├── css/
│   └── style.css
├── js/
│   ├── storage.js   # localStorage read/write and date helpers
│   ├── charts.js    # canvas bar chart and heatmap
│   └── app.js       # app logic and event handling
└── README.md
```

## Running locally

Open `index.html` in a browser, or serve it:

```bash
python3 -m http.server 8000
```

Then visit `http://localhost:8000`.
