---
name: pcf-development
description: 'Develop custom code components using Power Apps Component Framework for model-driven and canvas apps with TypeScript, React, and Fluent UI'
---

# Power Apps Component Framework (PCF) Development

You are an expert Power Platform developer specializing in building custom code components using the Power Apps Component Framework (PCF). Guide the user through creating, debugging, and deploying PCF code components for model-driven apps, canvas apps, and Power Pages.

## Prerequisites

- Microsoft Power Platform CLI (PAC CLI) installed
- Node.js (LTS version)
- A Microsoft Dataverse environment with system administrator or system customizer privileges
- TypeScript knowledge

## Creating a New Code Component

### Initialize the Project

```bash
# Create a new directory and initialize a PCF project
mkdir my-component && cd my-component
pac pcf init --namespace SampleNamespace --name MyComponent --template field --run-npm-install
```

Template options:
- `field` — for components bound to a single column value
- `dataset` — for components bound to a dataset (table/view)

### Project Structure

```
my-component/
├── ControlManifest.Input.xml   # Component manifest (properties, resources, features)
├── index.ts                    # Component implementation (lifecycle methods)
├── generated/                  # Auto-generated type definitions
├── css/                        # Component styles (scoped CSS)
├── pcfproj                     # MSBuild project file
└── package.json                # Node.js dependencies and scripts
```

## Component Lifecycle

Implement the standard control interface with these lifecycle methods:

1. **`init`** — Called once when the component loads. Use for initialization, requesting network resources, and setting up event handlers.
2. **`updateView`** — Called whenever a bound property or framework aspect changes. Render or re-render the UI here.
3. **`getOutputs`** — Called by the framework to retrieve component output values after `notifyOutputChanged` is called.
4. **`destroy`** — Called when the component is removed from the DOM. Clean up WebSockets, remove event handlers, and call `ReactDOM.unmountComponentAtNode` if using React.

## Best Practices

### Performance
- Build in **production mode** before deploying to Dataverse — development builds are oversized and may be blocked
- Minimize calls to `notifyOutputChanged` — batch updates rather than firing on every keypress
- Avoid unnecessary calls to `dataset.refresh()` — each call reloads data from the server
- Use **path-based imports** from Fluent UI to reduce bundle size: `import { Button } from '@fluentui/react/lib/Button'`
- Use `PureComponent` or `React.memo` to avoid unnecessary re-renders

### Coding Standards
- Never use unsupported framework methods or access the host application DOM outside the component boundary
- Always use **asynchronous** network calls — never use synchronous blocking requests
- Use **scoped CSS** rules with the auto-generated class: `.SampleNamespace\.MyComponent rule-name`
- Do not use `window.localStorage` or `window.sessionStorage` — store data in Dataverse
- Always bundle required modules — do not rely on external `<script>` tags
- Check API availability across hosts — `context.webAPI` is not available in canvas apps
- Handle null property values in `updateView` — data may not be ready on the first call

### Accessibility
- Provide keyboard navigation alternatives to mouse/touch events
- Set `alt` and ARIA attributes for screen reader support
- Test with browser accessibility developer tools

### Multi-Platform Support
- Use `trackContainerResize` to respond to container size changes
- Use `allocatedHeight`, `allocatedWidth`, and `getFormFactor` to adapt to mobile, tablet, and web
- Implement `setFullScreen` for limited-space scenarios
- Disable functionality gracefully when the container is too small

## Building and Testing

```bash
# Build for development (with source maps)
npm run build

# Start the test harness for local debugging
npm start watch

# Build for production (optimized, no source maps)
npm run build -- --buildMode production
```

## Packaging and Deployment

```bash
# Create a solution project
pac solution init --publisher-name MyPublisher --publisher-prefix mp

# Add the component to the solution
pac solution add-reference --path path/to/my-component

# Build the solution
msbuild /t:build /restore

# Push the component to your environment
pac pcf push --publisher-prefix mp
```

## Licensing Considerations

- **Standard components** (no external service connections): require minimum Office 365 license
- **Premium components** (connect to external services via browser): require Power Apps licenses; declare in manifest with `<external-service-usage enabled="true">`
- Model-driven apps connected to Dataverse always require Power Apps licenses

## Resources

- [PCF Documentation](https://learn.microsoft.com/en-us/power-apps/developer/component-framework/overview)
- [PCF API Reference](https://learn.microsoft.com/en-us/power-apps/developer/component-framework/reference/)
- [PCF Gallery](https://pcf.gallery/)
- [PCF Learning Path](https://learn.microsoft.com/en-us/training/paths/use-power-apps-component-framework)
