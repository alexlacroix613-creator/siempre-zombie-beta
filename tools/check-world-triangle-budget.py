"""Count actual default-scene GLB primitive instances, including reused meshes."""
import json
import struct
from pathlib import Path

root = Path(__file__).resolve().parents[1]
blob = (root / 'game/assets/world-lawn-v118-d7c4d3e9.glb').read_bytes()
length = struct.unpack_from('<I', blob, 12)[0]
gltf = json.loads(blob[20:20 + length])

def triangles(mesh):
    total = 0
    for primitive in gltf['meshes'][mesh]['primitives']:
        accessor = primitive.get('indices', primitive['attributes']['POSITION'])
        count = gltf['accessors'][accessor]['count']
        mode = primitive.get('mode', 4)
        total += count // 3 if mode == 4 else max(0, count - 2) if mode in (5, 6) else 0
    return total

def traverse(index):
    node = gltf['nodes'][index]
    return (triangles(node['mesh']) if 'mesh' in node else 0) + sum(traverse(c) for c in node.get('children', []))

reachable = sum(traverse(i) for i in gltf['scenes'][gltf.get('scene', 0)]['nodes'])
source = (root / 'game/grass-motion.js').read_text()
assert 'const limit=Math.min(100,' in source, 'grass hard cap changed; update budget explicitly'
grass_max = 100 * 5
assert reachable + grass_max < 150000
assert len(blob) < 25000000
print(json.dumps({'reachable_mesh_instance_triangles': reachable, 'unique_mesh_definition_triangles': sum(triangles(i) for i in range(len(gltf['meshes']))), 'grass_max_triangles': grass_max, 'world_plus_grass_max': reachable + grass_max, 'world_glb_bytes': len(blob)}))
