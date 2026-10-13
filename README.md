# Karabo Kiwi

**Kiwi is a web application for visualizing Karabo Scenes.**

The application is based on [react](https://react.dev/) and uses [shadcn/ui](https://ui.shadcn.com/) as the base for its UI.

The application has been bootstrapped using [vite](https://vitejs.dev/).

## Installation

A local installation of [node](https://nodejs.org/) is required.

Note for sudoless installations: since versions of `yarn` greater than `1.2.X` require `corepack enabled` to be set, the `nodejs` installation should be done via `nvm`. To install `nvm` the instructions at https://github.com/nvm-sh/nvm/blob/master/README.md#installing-and-updating should be followed.

The `vite`-compatible `node` versions are documented
at https://vitejs.dev/guide/#scaffolding-your-first-vite-project.

After cloning this project from `git`, execute the commands below to install and run the application (the installation of `yarn` mentioned above might not be needed; try `yarn --version`
before):

```
cd <working_folder_root>
npm install yarn
yarn install
yarn dev
```

## Cinema mode

Kiwi defaults to normal mode. Opening a `/cinema` bookmark selects cinema mode.

In the Load Project dialog, right-click a scene row (or focus its selection button
and press the context-menu key or Shift+F10) and choose
**Copy cinema URL**.
The action copies a bookmarkable URL for that scene and the connected GUI server
without opening the scene or closing the dialog. Save the copied URL as a browser
bookmark.

Bookmarks use this syntax (values are URL-encoded):

```text
https://kiwi.example/cinema?scene_uuid=<uuid>&host=<gui-host>&port=<gui-port>
```

At least one `scene_uuid` is required. Repeat `scene_uuid` to open several scenes
in bookmark order; the first successfully loaded scene is selected. `host` and
`port` are optional and must be supplied together. When omitted, Kiwi uses its
saved GUI server. Do not include a domain or project UUID: cinema retrieves scenes
directly and opens them as unattached scenes.

Kiwi captures the bookmark before connecting and replaces the address with bare
`/cinema`. Refresh and re-login reopen the original bookmark scenes from this
browser tab's session storage. Opening or closing scenes does not change that
launch. Opening a new bookmark replaces it; invalid bookmarks display an error
and do not reuse the previous launch. Without a stored launch, `/cinema` asks you
to open a cinema bookmark. Credentials resume only for the matching saved server;
other servers show login with the supplied host and port filled in.

## Testing

`Jest` is used for unit and integration testing with `React Testing Library` for component testing.

### Running Tests

Create test files with the `.test.tsx` or `.test.ts` extension (e.g., `MyComponent.test.tsx`) and run:

```bash
# Run tests in watch mode
yarn test

# Generate coverage report
yarn cov

```

### Script Reference

| Command | Description                                |
| ------- | ------------------------------------------ |
| `test`  | Runs tests in watch mode (development)     |
| `cov`   | Generates coverage report for source files |

### Test File Examples

**Component Test:**

```typescript
// MyComponent.test.tsx
import { render, screen } from '@testing-library/react'
import MyComponent from './MyComponent'

test('renders component correctly', () => {
  render(<MyComponent />)
  expect(screen.getByText('Hello World')).toBeInTheDocument()
})
```

**Utility/Helpers Test:**

```typescript
// utils.test.ts
import { myHelper } from './utils';

test('helper function works correctly', () => {
  expect(myHelper('input')).toBe('expected output');
});
```

## Running built application on docker using nginx

To launch a docker container running nginx with the Karabo Kiwi application files
being served from `/home/user/apps/kiwi` and accessible at `http://localhost:8080`
on the docker host:

```
docker run --name kiwi_app -v /home/user/apps/kiwi:/usr/share/nginx/html:ro -p 8080:80 -d nginx
```
