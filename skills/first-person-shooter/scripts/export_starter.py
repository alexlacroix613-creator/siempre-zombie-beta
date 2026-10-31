"""Export the pinned game and offline checks, without touching source or production."""
import argparse
import hashlib
import json
from pathlib import Path, PurePosixPath
import subprocess
import tarfile


def safe_name(name):
    p = PurePosixPath(name)
    forbidden = {'.git', '.vercel', 'node_modules', '__pycache__'}
    if (p.is_absolute() or not p.parts or p.parts[0] not in {'game', 'tools'}
            or '\\' in name or ':' in name
            or any(x in {'', '.', '..'} or x in forbidden or x.startswith('.env') for x in p.parts)):
        raise ValueError(f'Unsafe export path: {name}')
    return p


def export_project(source, output, manifest):
    source = Path(subprocess.check_output(
        ['git', '-C', str(source), 'rev-parse', '--show-toplevel'], text=True).strip()).resolve()
    requested = Path(output)
    if requested.is_symlink():
        raise ValueError('Output cannot be a symbolic link')
    output = requested.resolve()
    if output == source or source in output.parents:
        raise ValueError('Use an output folder outside the source checkout')
    if output.exists() and (not output.is_dir() or any(output.iterdir())):
        raise ValueError('Output must be a new or empty folder; nothing was overwritten')
    files = manifest['files']
    for name in files:
        safe_name(name)
    revision = manifest['revision']
    actual = subprocess.check_output(
        ['git', '-C', str(source), 'rev-parse', '--verify', revision + '^{commit}'], text=True).strip()
    if actual != revision:
        raise ValueError('Manifest must pin a full commit hash')
    output.mkdir(parents=True, exist_ok=True)
    found = set()
    # Stable text bytes across Windows/macOS/Linux; never change the user's Git config.
    proc = subprocess.Popen(['git', '-C', str(source), '-c', 'core.autocrlf=false', '-c', 'core.eol=lf',
                             'archive', '--format=tar', revision, 'game', 'tools'],
                            stdout=subprocess.PIPE, stderr=subprocess.PIPE)
    try:
        with tarfile.open(fileobj=proc.stdout, mode='r|') as archive:
            for member in archive:
                if member.name not in files:
                    continue
                relative = safe_name(member.name)
                if not member.isfile() or member.name in found:
                    raise ValueError(f'Nonregular or duplicate source entry: {member.name}')
                expected = files[member.name]
                if member.size != expected['bytes']:
                    raise ValueError(f'Source size differs from manifest: {member.name}')
                target = output.joinpath(*relative.parts)
                target.parent.mkdir(parents=True, exist_ok=True)
                if not target.parent.resolve().is_relative_to(output):
                    raise ValueError('Output parent escaped the destination')
                digest = hashlib.sha256()
                with archive.extractfile(member) as src, target.open('xb') as dst:
                    while block := src.read(1024 * 1024):
                        digest.update(block)
                        dst.write(block)
                if digest.hexdigest() != expected['sha256']:
                    raise ValueError(f'Source hash differs from manifest: {member.name}')
                found.add(member.name)
        proc.stdout.close()
        error = proc.stderr.read().decode(errors='replace')
        if proc.wait(timeout=30):
            raise RuntimeError('Git archive failed: ' + error[:500])
        if found != set(files):
            raise ValueError('Missing pinned files: ' + ', '.join(sorted(set(files) - found)[:5]))
    finally:
        if proc.poll() is None:
            proc.kill()
            proc.wait(timeout=10)
        proc.stdout.close()
        proc.stderr.close()
    receipt = {'repository': manifest['repository'], 'revision': revision, 'fileCount': len(found),
               'bytes': sum(v['bytes'] for v in files.values()), 'files': files}
    (output/'FPS-SOURCE.json').write_text(json.dumps(receipt, indent=2)+'\n', encoding='utf-8')
    (output/'.gitignore').write_text('**/node_modules/\n**/.vercel/\n**/.env*\n**/__pycache__/\n', encoding='utf-8')
    (output/'README.md').write_text(
        '# FPS reference game\n\nExported from ' + manifest['repository'] + ' at `' + revision + '`.\n\n'
        'Run `python -m http.server 8769 --bind 127.0.0.1 --directory game`, then open '
        'http://127.0.0.1:8769/. Static serving uses local/device scores when the API is unavailable.\n\n'
        'This is the original branded reference, not an unbranded licensed asset pack. Before derivative '
        'release, obtain asset rights and retarget title/story, canonical/share URLs, API/storage namespace '
        'and score season. Sharing otherwise links to the original Siempre game. Configure your own '
        'backend environment; no credentials or deployment target are included. '
        'Do not connect a derivative to the original production board.\n', encoding='utf-8')
    return receipt


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--source', required=True, type=Path, help='Authorized Git checkout containing the pinned commit')
    parser.add_argument('--output', required=True, type=Path, help='New or empty folder outside that checkout')
    args = parser.parse_args()
    manifest = json.loads((Path(__file__).resolve().parents[1]/'references/source-manifest.json').read_text(encoding='utf-8'))
    try:
        result = export_project(args.source, args.output, manifest)
    except (ValueError, RuntimeError, OSError, subprocess.SubprocessError, tarfile.TarError) as error:
        parser.exit(1, f'Export failed: {error}\nAn interrupted export may leave a partial folder; no files are deleted.\n')
    print(json.dumps({'output': str(args.output.resolve()), 'revision': result['revision'],
                      'verifiedFiles': result['fileCount'], 'bytes': result['bytes']}))


if __name__ == '__main__':
    main()
