"""Runtime-only provider configuration. Never print or persist secret input."""
import json, os, shutil, subprocess, sys
env=os.environ.copy()
env.update(VERCEL_PROJECT_ID='prj_OcfrCPlPeGKfWqsA9v5p2kTP62ze',VERCEL_ORG_ID='team_lEsgHm86PzVNhPOdFpJmxOIN')
cli=shutil.which('vercel.cmd') or shutil.which('vercel')
try:
 if sys.argv[1]=='--status':
  p=subprocess.run([cli,'env','ls','production','--format=json','--scope',env['VERCEL_ORG_ID']],env=env,capture_output=True,text=True)
  d=json.loads(p.stdout)
  print(json.dumps({'configured':[x['key'] for x in d['envs'] if x['key'] in ['ZOMBIE_DATABASE_URL','ZOMBIE_RUN_SIGNING_KEY']]}))
  sys.exit(p.returncode)
 removing=sys.argv[1]=='--rollback-created'
 key=sys.argv[2] if removing else sys.argv[1]
 if key not in ['ZOMBIE_DATABASE_URL','ZOMBIE_RUN_SIGNING_KEY']: raise ValueError('Unexpected setting')
 if removing:
  p=subprocess.run([cli,'env','remove',key,'production','--yes','--scope',env['VERCEL_ORG_ID']],env=env,capture_output=True,text=True)
  print(json.dumps({'key':key,'rolledBack':p.returncode==0}))
  sys.exit(p.returncode)
 value=sys.stdin.read()
 if len(value)<32: raise ValueError('Missing input')
 p=subprocess.run([cli,'env','add',key,'production','--sensitive','--yes','--scope',env['VERCEL_ORG_ID']],input=value,env=env,capture_output=True,text=True)
 print(json.dumps({'key':key,'stored':p.returncode==0}))
 sys.exit(p.returncode)
except Exception:
 print(json.dumps({'error':'Provider configuration failed; details withheld.'}))
 sys.exit(1)
