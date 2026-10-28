// Four useful restock points; the scanned world and gameplay share this selection.
export const REFILL_SPOTS=[
  {id:0,x:8,z:6},{id:2,x:11,z:-14},{id:5,x:-17,z:15},{id:7,x:-21,z:2},
];
const active=new Set(REFILL_SPOTS.map(p=>p.id));
export function inactiveRefillNode(name){
  const collider=/^col_refill_(\d+)$/.exec(name),art=/^barrel_refill_(\d+)_/.exec(name);
  const id=collider?Number(collider[1]):art?Number(art[1])-1:null;
  return id!==null&&!active.has(id);
}
