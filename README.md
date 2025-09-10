# Karabo Kiwi

**Kiwi is a web application for visualizing Karabo Scenes.**

The application is based on [react](https://react.dev/) and uses [mui-material](https://mui.com/material-ui/) as the base for its UI.

The application has been bootstrapped using [vite](https://vitejs.dev/). As some information in the templated `vite`-generated `README.md` file may still be useful during this initial phase, the generated contents have been preserved below.

## Installation

A local installation of [node](https://nodejs.org/) is required. 

The `vite`-compatible `node` versions are documented
at https://vitejs.dev/guide/#scaffolding-your-first-vite-project.

After cloning this project from `git`, execute the commands below to install and run the application:

```
cd <working_folder_root>
yarn install
yarn dev
```` 

## Original README.md contents scaffolded by `vite` 

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react/README.md) uses [Babel](https://babeljs.io/) for Fast Refresh
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh

## Expanding the ESLint configuration

If you are developing a production application, we recommend updating the configuration to enable type aware lint rules:

- Configure the top-level `parserOptions` property like this:

```js
export default tseslint.config({
  languageOptions: {
    // other options...
    parserOptions: {
      project: ['./tsconfig.node.json', './tsconfig.app.json'],
      tsconfigRootDir: import.meta.dirname,
    },
  },
})
```

- Replace `tseslint.configs.recommended` to `tseslint.configs.recommendedTypeChecked` or `tseslint.configs.strictTypeChecked`
- Optionally add `...tseslint.configs.stylisticTypeChecked`
- Install [eslint-plugin-react](https://github.com/jsx-eslint/eslint-plugin-react) and update the config:

```js
// eslint.config.js
import react from 'eslint-plugin-react'

export default tseslint.config({
  // Set the react version
  settings: { react: { version: '18.3' } },
  plugins: {
    // Add the react plugin
    react,
  },
  rules: {
    // other rules...
    // Enable its recommended rules
    ...react.configs.recommended.rules,
    ...react.configs['jsx-runtime'].rules,
  },
})
```
