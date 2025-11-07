# FormXpress (npm: jquery-formxpress)

Universal jQuery Auto-Validation & Smart-Upload Plugin.

![License](https://img.shields.io/badge/license-MIT-blue.svg) ![npm](https://img.shields.io/npm/v/jquery-formxpress) ![Downloads](https://img.shields.io/npm/dt/jquery-formxpress)

## Features

- Automatic input validation (required, length, number ranges, patterns, email, URL, phone).
- Humanized field names in error messages.
- Custom field-level validation rules via `customRules`.
- Multi-file upload with previews, individual remove buttons, and per-file progress bars.
- File type & size validation.
- AJAX submission with hooks (`beforeValidate`, `afterValidate`, `beforeSubmit`, `onSuccess`, `onError`, `onProgress`).
- Public instance methods: `reset()`, `validate()`, `clearErrors()`.
- Zero additional CSS dependency (injects minimal styles automatically – override if desired).
- TypeScript declarations included.

## Installation

```bash
npm install jquery-formxpress
```

Add jQuery (peer dependency) if not already installed:

```bash
npm install jquery
```

## Usage (Module / Bundler)

```html
<script src="https://code.jquery.com/jquery-3.6.0.min.js"></script>
<script src="./node_modules/jquery-formxpress/dist/form-xpress.min.js"></script>
<script>
  $("#myForm").FormXpress({
    successMessage: "Sent!",
    onSuccess: function (res, form) {
      alert("Success");
      form.data("FormXpress").reset();
    },
  });
</script>
```

## CDN Usage

You can use jsDelivr or unpkg once published:

```html
<script src="https://code.jquery.com/jquery-3.6.0.min.js"></script>
<!-- Latest version (replace 1.0.5 with desired or omit for latest) -->
<script src="https://cdn.jsdelivr.net/npm/jquery-formxpress@1.0.5/dist/form-xpress.min.js"></script>
<!-- OR -->
<script src="https://unpkg.com/jquery-formxpress@1.0.5/dist/form-xpress.min.js"></script>
```

After publishing new versions, CDN caches may take a short time to refresh. Append `?v=1.0.1` for cache-busting if needed.

## Basic Example

```html
<form id="contactForm" method="POST" action="/api/contact">
  <input type="text" name="full_name" required minlength="3" />
  <input type="email" name="email_address" required />
  <textarea name="message" required minlength="10"></textarea>
  <button type="submit">Send</button>
</form>
<script>
  $("#contactForm").FormXpress({
    onSuccess: function (resp, form) {
      alert("Message sent");
      form.data("FormXpress").reset();
    },
  });
</script>
```

## Options

```ts
interface FormXpressOptions {
  submitButton?: string | null;
  errorClass?: string;
  errorSpanClass?: string;
  progressBarClass?: string;
  previewClass?: string;
  showNameError?: boolean;
  humanizeNames?: boolean;
  successMessage?: string;
  ajax?: boolean;
  resetAfterSubmit?: boolean;
  maxFileSize?: number; // bytes
  allowedFileTypes?: string[]; // e.g. ['image/*','application/pdf']
  customRules?: {
    [fieldName: string]: (value: string, input: JQuery) => string | null;
  };
  beforeValidate?: (form: JQuery) => void;
  afterValidate?: (form: JQuery, isValid: boolean) => void;
  beforeSubmit?: (form: JQuery, formData: FormData) => boolean;
  onSuccess?: (response: any, form: JQuery) => void;
  onError?: (xhr: XMLHttpRequest, form: JQuery) => void;
  onProgress?: (percent: number, form: JQuery) => void;
  messages?: { [key: string]: string };
}
```

## Public Methods

```js
const fm = $("#myForm").data("FormXpress");
fm.validate(); // returns boolean
fm.reset(); // resets form + clears previews
fm.clearErrors(); // removes error classes & spans
```

## Development

```bash
# Install dependencies
npm install
# Build (produces dist/form-xpress.min.js)
npm run build
```

Distributed files:

- `dist/form-xpress.js` (unminified with license header)
- `dist/form-xpress.min.js` (minified for production)

## Release & Publishing Workflow

1. Ensure code & types updated in `src/` and `types/`.
2. Update version in `package.json` following semantic versioning (MAJOR.MINOR.PATCH).
3. Update `CHANGELOG.md` with new version section.
4. Commit changes & push.
5. Create a git tag: `git tag v1.0.1 && git push origin v1.0.1`.
6. Create a GitHub Release from that tag (the GitHub Action will run and publish to npm automatically using `NPM_TOKEN`).
7. Verify on npm: `https://www.npmjs.com/package/jquery-formxpress`.
8. CDN links will reflect the new version (e.g. `jquery-formxpress@1.0.1`).

### Manual Publish (Alternative)

If you prefer direct publish:

```bash
npm login
npm version patch   # or minor / major
npm publish --access public
```

### Keep Types Correct

If API changes (options or instance methods), also update `types/index.d.ts` and bump at least a MINOR version.

## Contributing

PRs welcome! Please:

- Fork & create feature branch.
- Add tests (if test suite added later).
- Update docs & changelog.

## License

MIT © Masum
