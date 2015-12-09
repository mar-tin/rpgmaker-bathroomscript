'use strict';

var needW = 0;
var needM = 0;
var holdW = 200;
var holdM = 300;
var incW = 15;
var incM = 15;
var trainW = 40;
var trainM = 40;

const ITERATIONS = 1000000;

const FLAGCOUNT = 2; // number of states

const STATE_WET  = 1<<0;     // 0x1
const STATE_MESSY = 1<<1;    // 0x2

function getFeelReq(need)
{
  return (need < 0.10446 || need > 1) ? 1 : 5.755 * Math.pow(need, 4) -10.619 * Math.pow(need, 3) +4.984 * Math.pow(need, 2) -1.091 * need +1.071;
}

function getFeelRnd(train)
{
  var t = train/100;
  return Math.pow(Math.random(), 1.5 * (1-Math.pow(t, 2)) + 0.5) * (0.9 * t + 0.1);
}

function rnd(a,b)
{
  var min, max;
  if (typeof b === 'undefined')
  {
    min = 0;
    max = a;
  } else {
    min = a;
    max = b;
  }

  return Math.floor(Math.random() * (max-min+1)) + min;
}

function setTrain(t)
{
  trainW = t;
  trainM = t;
}

function feel(type)
{
  var rtn = {wet: false, messy: false};
  if (type & STATE_WET)
  {
    var tempRnd = getFeelRnd(trainW);
    //console.log(needW/holdW + ' ' + getFeelReq(needW/holdW) + ' ' + tempRnd);
    if(getFeelReq(needW/holdW) < tempRnd)
    {
      //console.log('I need to pee');
      rtn.wet = true;
      //$gameMessage.add('I have to pee');
    }
  }

  if (type & STATE_MESSY)
  {
    if(getFeelReq(needM/holdM) < getFeelRnd(trainM))
    {
      //console.log('I need to Poop');
      rtn.messy = true;
      //$gameMessage.add('I have to poop');
    }
  }

  return rtn;
}

function debug(x)
{

  setTrain(x);
  debug();
  var stat = {feelW: 0, feelM: 0, wet: 0, messy: 0, wCount: [], mCount: []};
  var wCount = 0;
  var mCount = 0;

  for (let i=0; i<ITERATIONS; i++)
  {
    needW += rnd(1,incW);
    needM += rnd(1,incM);

    if (needW > holdW) {needW = 0; stat.wet++; stat.wCount.push(wCount); wCount = 0;}
    if (needM > holdM) {needM = 0; stat.messy++; stat.mCount.push(mCount); mCount = 0;}

    var rtn = feel(STATE_WET | STATE_MESSY);

    if (wCount !== 0) {wCount++;}
    if (mCount !== 0) {mCount++;}

    if (rtn.wet) {stat.feelW++;}
    if (rtn.messy) {stat.feelM++;}

    if (rtn.wet && wCount === 0) {wCount++;}
    if (rtn.messy && mCount === 0) {mCount++;}

  }

  var wCountSum = 0;
  var wNoWarn = 0;
  for (let i = stat.wCount.length - 1; i >= 0; i--) {
    wCountSum += stat.wCount[i];
    if (stat.wCount[i] === 0) {wNoWarn++;}
  }

  var wCountAve = wCountSum/stat.wCount.length;

  var mCountSum = 0;
  var mNoWarn = 0;
  for (let i = stat.mCount.length - 1; i >= 0; i--) {
    mCountSum += stat.mCount[i];
    if (stat.mCount[i] === 0) {mNoWarn++;}
  }

  var mCountAve = wCountSum/stat.mCount.length;

  //console.log('wet feel: ' + stat.feelW + ' accidents: ' + stat.wet + ' f/a: ' + (stat.feelW/stat.wet).toFixed(4) + ' aveCount: ' + wCountAve.toFixed(4) + ' noWarn: ' + wNoWarn + '(' + (wNoWarn*100/stat.wet).toFixed(1) + '%)');
  //console.log('mess feel: ' + stat.feelM + ' accidents: ' + stat.messy + ' f/a: ' + (stat.feelM/stat.messy).toFixed(4) + ' aveCount: ' + mCountAve.toFixed(4) + ' noWarn: ' + mNoWarn + '(' + (mNoWarn*100/stat.messy).toFixed(1) + '%)');
  console.log(x + ': wet: ' + (wNoWarn*100/stat.wet).toFixed(1) + ' mess: ' + (mNoWarn*100/stat.messy).toFixed(1) + '%');

  stat = null;
  wNoWarn = null;
  mNoWarn = null;
  wCount = null;
  mCount = null;
  wCountSum = null;
  mCountSum = null;
  mCountAve = null;
  wCountAve = null;
  
}