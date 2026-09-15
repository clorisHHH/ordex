import {test} from 'node:test';
import assert from 'node:assert/strict';
import {rowDropTarget} from './drop-target.js';
const rect={top:100,bottom:144,left:200,width:600};
test('上下边缘优先于左右分区',()=>{
  for(const x of [210,790]){
    assert.deepEqual(rowDropTarget(rect,x,107),{position:'before',zone:'top'});
    assert.deepEqual(rowDropTarget(rect,x,137),{position:'after',zone:'bottom'});
  }
});
test('中心左半区插后，右半区下一级，边界无空隙',()=>{
  assert.deepEqual(rowDropTarget(rect,499,122),{position:'after',zone:'left'});
  assert.deepEqual(rowDropTarget(rect,500,122),{position:'inside',zone:'right'});
  assert.equal(rowDropTarget(rect,210,108).zone,'left');
  assert.equal(rowDropTarget(rect,790,136).zone,'right');
});
