"""Run selected offline reference checks; never deploy, install packages or submit scores."""
import argparse
import json
from pathlib import Path
import shutil
import subprocess


def main():
    manifest = json.loads((Path(__file__).resolve().parents[1]/'references/source-manifest.json').read_text(encoding='utf-8'))
    groups = manifest['checkGroups']
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--project', required=True, type=Path)
    parser.add_argument('--group', choices=[*groups, 'all'], default='controls')
    args = parser.parse_args()
    project = args.project.resolve()
    node = shutil.which('node')
    if not node:
        parser.exit(1, 'Node.js is required; the reference targets Node 22.\n')
    paths = list(dict.fromkeys(path for group in (groups.values() if args.group == 'all' else [groups[args.group]]) for path in group))
    missing = [p for p in paths if not (project/p).is_file()]
    if missing:
        parser.exit(1, 'Missing checks: ' + ', '.join(missing) + '\n')
    failures = []
    for path in paths:
        command = [node] + (['--test'] if path.endswith('.test.mjs') else []) + [path]
        try:
            result = subprocess.run(command, cwd=project, capture_output=True, text=True, timeout=60)
            if result.returncode:
                failures.append(path)
                print('FAIL ' + path + '\n' + (result.stdout + result.stderr)[-5000:])
            else:
                print('PASS ' + path)
        except subprocess.TimeoutExpired:
            failures.append(path)
            print('FAIL ' + path + ': exceeded 60 seconds')
    print(f'{len(paths)-len(failures)}/{len(paths)} offline checks passed. Browser/device acceptance remains separate.')
    raise SystemExit(bool(failures))


if __name__ == '__main__':
    main()
