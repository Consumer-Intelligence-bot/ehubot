# Shopping & Switching Dashboard

React + Vite dashboard for insurer shopping and switching analytics.

## Data file selection (production)

When starting the server, you can choose which CSV files to use for Motor and Home data. The last-used names are remembered.

### Deploy and run

1. **Build locally:**
   ```bash
   npm run build
   ```

2. **Copy to server:** Upload `dist/`, `scripts/`, `package.json`, and create a `data/` folder with your CSV files.

3. **On the server, start with file selection:**
   ```bash
   npm run start
   ```
   You will be prompted:
   - **Motor data file** [last used or motor_main_data_demo.csv]
   - **Home data file** [last used or all home data.csv]

   Press Enter to keep the default, or type a new filename. The script copies the chosen files into `dist/data/` and starts the web server.

4. **Environment variables (optional):**
   - `DATA_DIR` – directory containing your CSV files (default: `./data`)
   - `DIST_DIR` – built app directory (default: `./dist`)

---

## React + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Babel](https://babeljs.io/) (or [oxc](https://oxc.rs) when used in [rolldown-vite](https://vite.dev/guide/rolldown)) for Fast Refresh
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and [`typescript-eslint`](https://typescript-eslint.io) in your project.
