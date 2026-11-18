const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const env={window:{}};vm.runInNewContext(fs.readFileSync('js/questions.js','utf8'),env);
const api=env.window.KanjiQuestions;
const questions=JSON.parse(JSON.stringify(api.parseQuestions(fs.readFileSync('data/kanji_400_final.csv','utf8'))));
const order=[...new Set(questions.map(q=>q.target))];const identity=a=>[...a];
const pick=(selected,total,history={})=>api.pickFocusedQuestions({questions,selected,order,history,total,shuffleFn:identity});
const chosen=order.slice(0,60),focus=new Set(chosen.slice(-10));
assert.deepEqual(Array.from(api.focusKanji([...chosen].reverse(),order)),chosen.slice(-10));
for(const total of [15,20]){
 const result=pick([...chosen].reverse(),total);assert.equal(result.length,total);assert.equal(new Set(result.map(q=>q.id)).size,total);
 assert(result.every(q=>chosen.includes(q.target)));
 const blocks=total===20?[result.slice(0,10),result.slice(10)]:[result];
 for(const block of blocks){assert.equal(block.filter(q=>focus.has(q.target)).length,Math.ceil(block.length/2));assert.equal(new Set(block.filter(q=>focus.has(q.target)).map(q=>q.target)).size,Math.ceil(block.length/2));}
}
const sparse=[order[1],order[5],order[10],order[20],order[30],order[40],order[50],order[60],order[70],order[75],order[79]];
assert.deepEqual(Array.from(api.focusKanji([...sparse].reverse(),order)),sparse.slice(-10));
assert(!api.focusKanji(chosen.filter(k=>k!==chosen.at(-1)),order).includes(chosen.at(-1)));
assert.equal(api.focusKanji([...chosen,order[70]],order).at(-1),order[70]);
for(const total of [15,20]){const one=pick([order[0]],total);assert.equal(one.length,total);assert.equal(new Set(one.slice(0,5).map(q=>q.id)).size,5);assert(one.every(q=>q.target===order[0]));}
const fewer=pick(order.slice(0,3),20);assert.equal(new Set(fewer.slice(0,15).map(q=>q.id)).size,15);
const eleven=pick(order.slice(0,11),20);assert.equal(new Set(eleven.map(q=>q.id)).size,20);assert.equal(eleven.filter(q=>q.target===order[0]).length,5);
assert.throws(()=>pick([],20));
// Within a range: unseen first, then mistaken, then oldest seen (logical sequence, not dates).
const tiny=[{id:1,target:'木'},{id:2,target:'木'},{id:3,target:'木'},{id:4,target:'木'}];
const history={1:{seen:1,wrong:0,lastSeen:2},2:{seen:1,wrong:1,lastSeen:99},4:{seen:1,wrong:0,lastSeen:1}};
const sorted=api.pickFocusedQuestions({questions:tiny,selected:['木'],order:['木'],history,total:4,shuffleFn:identity});assert.deepEqual(Array.from(sorted,q=>q.id),[3,2,4,1]);
const before=JSON.stringify({questions,history,chosen});pick(chosen,20,history);assert.equal(JSON.stringify({questions,history,chosen}),before);
console.log('PASS: CSV tail ten from 60/reversed/sparse selections, 5+5 halves/8+7 training, balanced coverage, ranking, fallback/repetition and no mutation');
