import hashlib,json,pathlib,subprocess
root=pathlib.Path(__file__).resolve().parents[1]
base='https://siempre-zombie-beta.vercel.app'
def request(path,body=None):
 args=['curl.exe','--ssl-no-revoke','--silent','--show-error','--max-time','35','--write-out','\n%{http_code}',base+path]
 if body is not None: args+=['--header','Content-Type: application/json','--data-binary','@-']
 p=subprocess.run(args,input=json.dumps(body).encode() if body is not None else None,capture_output=True)
 data,code=p.stdout.rsplit(b'\n',1)
 return int(code),data
proof={'deployment':'dpl_7eZGMtMmXQCYUWCr1rAySZYncGta','url':base,'assets':{}}
for name in ['index.html','siempre-zombie.js','landing-leaderboard.css','leaderboard-config.js','assets/leaderboard-gas-chrome.png','gatling-source-views.js']:
 code,body=request('/'+name)
 proof['assets'][name]={'http':code,'matchesLocal':hashlib.sha256(body).digest()==hashlib.sha256((root/'game'/name).read_bytes()).digest()}
code,body=request('/api/siempre-zombie/leaderboard')
try:
 board=json.loads(body);proof['sharedBoard']={'http':code,'scope':board.get('scope'),'season':board.get('season'),'players':board.get('totalPlayers')}
 code,body=request('/api/siempre-zombie/runs',{'name':'__beta_connection_check__','rulesVersion':'courtyard-waves-v1'})
 run=json.loads(body);proof['startRun']={'http':code,'signedRunIssued':bool(run.get('runId'))}
 code,body=request('/api/siempre-zombie/scores',{'runId':run.get('runId'),'name':'__beta_connection_check__','rulesVersion':'courtyard-waves-v1','score':999999999,'wave':1,'kills':0,'headshots':0,'durationMs':1000})
 proof['impossibleScoreRejected']=code==422
 code,body=request('/api/siempre-zombie/runs',{'name':'bad handle','rulesVersion':'courtyard-waves-v1'})
 proof['invalidHandleRejected']=code==422
 code,body=request('/api/siempre-zombie/leaderboard');proof['noProbeScoreInserted']=all(x.get('handle')!='__beta_connection_check__' for x in json.loads(body).get('entries',[]))
except Exception:proof['apiVerificationFailed']=True
(root/'leaderboard-work'/'LIVE-VERIFICATION.json').write_text(json.dumps(proof,indent=2)+'\n',encoding='utf-8')
print(json.dumps(proof,indent=2))
