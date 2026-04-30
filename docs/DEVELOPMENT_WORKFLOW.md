# Development Workflow

## VS Code Terminal Profiles

The workspace defines named VS Code terminal profiles in `.vscode/settings.json`.
Each profile opens `/usr/bin/zsh` directly. They are plain idle terminals; they
do not run project commands when opened.

Current profiles:

- Dev
- Frontend Build
- Test
- Build Artifacts
- Local Integration
- Go Tests
- Bastion SSH
- Bastion Proxy
- Production
- Shell 1
- Shell 2

The workspace also recommends the `ryuta46.multi-command` extension in
`.vscode/extensions.json`. That extension provides the single command used to
open all workflow terminals in order:

```text
multiCommand.openWorkflowTerminals
```

To run it manually:

```text
Ctrl+Shift+P
multiCommand.openWorkflowTerminals
```

If the command is not shown directly, use:

```text
Ctrl+Shift+P
Multi command: Execute multi command
```

Then choose `multiCommand.openWorkflowTerminals`.

## Suggested Shortcut

Recommended user keybinding:

```json
{
  "key": "ctrl+alt+t",
  "command": "extension.multiCommand.execute",
  "args": {
    "command": "multiCommand.openWorkflowTerminals"
  }
}
```

Add it in:

```text
Ctrl+Shift+P
Preferences: Open Keyboard Shortcuts (JSON)
```

The shortcut opens the named terminal profiles only. It does not run
`dev_start.sh`, `test_start.sh`, local integration, Bastion scripts, tests, or
builds.
