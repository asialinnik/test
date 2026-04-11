---
name: skill-creator
description: >
  Creates new Claude Code skills (SKILL.md files). Use when the user wants to
  build a reusable slash command, automate a repeated workflow, or package
  Claude instructions into a shareable skill. Trigger phrases: "create a skill",
  "make a skill", "new skill", "build a skill", "skill creator".
---

# Skill Creator

Guides the user through designing and creating a new Claude Code skill,
then writes the SKILL.md file to the appropriate location.

## Workflow

Make a todo list for all tasks in this workflow and work through them one by one.

### 1. Gather Requirements

Ask the user the following (collect all answers before proceeding):

- **Name**: What should the skill be called? (used as the slash command,
  e.g. `my-skill` → `/my-skill`; lowercase, hyphenated)
- **Purpose**: What does this skill do? When should Claude use it?
  (1–3 sentences — becomes the `description` frontmatter and the trigger
  for automatic invocation)
- **Scope**: Should this skill be available globally (all projects) or only
  in this repository?
  - Global → `~/.claude/skills/<name>/SKILL.md`
  - Project → `.claude/skills/<name>/SKILL.md`
- **Workflow**: Ask the user to describe the steps the skill should perform.
  Capture enough detail to write concrete, actionable instructions.

### 2. Design the Skill

Based on the gathered requirements, draft:

1. **Frontmatter** — `name` and `description` fields.
2. **Introduction section** — one paragraph summarising what the skill does.
3. **Workflow steps** — numbered sections, each with:
   - A clear heading
   - Specific instructions Claude should follow
   - Any relevant code blocks, templates, or examples
4. **Wrap-up section** — what Claude should tell the user when done.

Keep instructions imperative ("Do X", "Run Y", "Ask Z"). Avoid vague guidance.

### 3. Preview and Confirm

Show the user the full SKILL.md content and ask for approval before writing
any files. Incorporate any requested changes.

### 4. Write the Skill File

Create the skill file at the agreed location:

```bash
# Global skill
mkdir -p ~/.claude/skills/<name>
cat > ~/.claude/skills/<name>/SKILL.md << 'EOF'
<content>
EOF

# Project skill
mkdir -p .claude/skills/<name>
cat > .claude/skills/<name>/SKILL.md << 'EOF'
<content>
EOF
```

### 5. Validate Structure

Confirm the file was written correctly:

```bash
cat ~/.claude/skills/<name>/SKILL.md   # global
# or
cat .claude/skills/<name>/SKILL.md     # project
```

Check that:
- Frontmatter is valid YAML between `---` delimiters
- `name` matches the directory name
- `description` clearly captures when the skill should be invoked
- All workflow steps are present and readable

### 6. Commit (project skills only)

If the skill is project-scoped, stage and commit it:

```bash
git add .claude/skills/<name>/SKILL.md
git commit -m "Add <name> skill"
```

Ask the user if they also want to push.

## Wrap Up

Provide a summary with:

- **Skill name** and slash command (e.g. `/my-skill`)
- **Location** of the SKILL.md file
- **How to invoke it** — by typing `/<name>` in Claude Code or describing
  the use-case so Claude picks it up automatically
- **Next steps** — suggest testing the skill and iterating on the workflow
  if needed
