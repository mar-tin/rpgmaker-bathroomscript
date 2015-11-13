//===============================================================================
 /*:
 * @plugindesc Potty System
 * @author Martin
 * 
 * @param defaultWear
 * @desc What you start out wearing: 
 * 0 = Undies, 1 = pullups, 2 = diapers
 * @default 0
 * 
 * @param wetSwitch
 * @desc Switch that is kept up to date with the current wetness 
 * state, 0 is off.
 * @default 0
 * 
 * @param messySwitch
 * @desc Switch that is kept up to date with the current messyness 
 * state, 0 is off.
 * @default 0
 *
 * @param underwearVar
 * @desc Var that is kept up to date with the current underwear 
 * type, 0 is off.
 * @default 0
 * 
 * @param timer
 * @desc How often the main loops needs to be repeated. Seconds 
 * between loops.
 * @default 10
 * 
 * @param startRunning
 * @desc Start the game with the timer runnung
 * @default true
 * 
 * @param holdW
 * @desc how much pee can be held by default. Will only be used at
 * the start of the game after that use commands to change it
 * @default 200
 * 
 * @param holdM
 * @desc how much poop can be held by default. Will only be used at
 * the start of the game after that use commands to change it
 * @default 300
 * 
 * @param trainW
 * @desc How well the player can hold their pee. 0-100
 * @default 40
 * 
 * @param trainM
 * @desc How well the player can hold their poop. 0-100
 * @default 40
 * 
 * @param wetInc
 * @desc how much max (random number between 0 and this number) to 
 * add each loop to the need to pee.
 * @default 15
 * 
 * @param messInc
 * @desc how much max (random number between 0 and this number) to 
 * add each loop to the need to poop.
 * @default 15
 *
 * @param equimentId
 * @desc Number of the first underwear (Clean Undies) See help.
 * @default 0
 * 
 * @param idOffsetFemale
 * @desc Offset for the first female armor items from the default
 * equipment id.
 * @defalut 0
 * 
 * @param idOffsetGeneric
 * @desc Offset for the first generic armor items from the default
 * equipment id.
 * @default 0
 *
 * @param underwearSlot
 * @desc Number of the underwear slot, found in Database->Types
 * ->Equipment Types, if it doesn't exist create one.
 * @default 5
 * 
 * @param defaultGender
 * @desc Default gender used unless set elsewhere via commands.
 * 0 = male, 1 = female, 2 = generic
 * @default 0
 * 
 * @help
 * Equipment:
 * 
 * This plugin can swap out armor to indicate the type of underwear and 
 * status currently appropriate. If so you will have to provide the appropriate
 * armor items equipment slot (defaulted to the values needed from the demo).
 * Also you will have to change what is being worn using this script rather than
 * the default rpg-maker commands as otherwise the plugin won't know.
 * 
 * The order of items is: Undies - Pullups - Diapers and within each item the
 * order is: clean - Wet - Messy - Wet and Messy.
 * 
 * Also it is possible to set diffent equipment slots for different genders.
 * Those start by defalut at 0 which means they will use the same items. If you
 * want to change this change it how much higher the itemid is. (if you add them
 * right after eachother it will be 12 and 24, they are set this way in the demo)
 *  
 * Commands:
 * 
 * PottySystem is case sensitive but the rest of the command isn't.
 * 
 * <> is mandatory input
 * [] is optional input
 * 
 * PottySystem autorun
 * Makes sure the PottySystem runs, needs to be called at least once after 
 * starting and each savegame load. (Easiest way to do that is add an event
 * as described above.)
 * 
 * PottySystem start
 * Starts the main loop at the set time interval.
 * 
 * PottySystem stop
 * Stops the main loop. All commands will still work but bladder won't fill, it 
 * won't trigger automaticlly feeling the need to go and having accidents.
 * 
 * PottySystem wet
 * manually triggers wetting event;
 * 
 * PottySystem mess
 * Manually triggers messing event
 * 
 * PottySystem setWear <type>
 * Set current type of underwear: 
 * 0 = undies, 1 = pullups, 2 = diapers
 * 
 * PottySystem setNeedWet <need>
 * Set or change the current need to pee. 
 * To set enter a number, to change use + or - as the first character.
 * 
 * PottySystem setNeedMess <need>
 * Set or change the current need to poop.
 * To set enter a number, to change use + or - as the first character.
 * 
 * PottySystem setWet [boolean]
 * Change the current state of the underwear to be or no longer be wet
 * If no value is provided true is assumed. valid values: true,false,0,1
 * 
 * PottySystem setMessy [boolean]
 * Change the current state of the underwear to be or no longer be messy
 * If no value is provided true is assumed. valid values: true,false,0,1
 * 
 * PottySystem setClean
 * Change the current state of the underwear to be clean (not wet ond not messy)
 * 
 * PottySystem isWet <switch>
 * Sets the provided switch number to the current wetness state.
 * 
 * PottySystem isMessy <switch>
 * Sets the provided switch number to the current messyness state.
 */
//===============================================================================

var external = {};

(function(e) 
{
  "use strict"

  var params = PluginManager.parameters('PottySystem');

  var running = false;
  var loop = 'blocked';

  var timer, current_wear, needW, needM, holdW, holdM, incW, incM, trainW, trainM;
  var wetSwitch, messySwitch, wearVar, gender, underwearSlot;
  var armorId = [];

  const FLAGCOUNT = 2;

  const WET  = 1<<0;     // 0x1
  const MESSY = 1<<1;    // 0x2

  const UNDIES  = 0<<FLAGCOUNT; // 0
  const PULLUPS = 1<<FLAGCOUNT; // 4
  const DIAPERS = 2<<FLAGCOUNT; // 8

  const PRONOUNS = {
    male: {subject: 'he', object: 'him', prenom_pos: 'his', predic_pos: 'his', reflexive: 'himself'},
    female: {subject: 'she', object: 'her', prenom_pos: 'her', predic_pos: 'hers', reflexive: 'herself'},
    neutral: {subject: 'they', object: 'them', prenom_pos: 'their', predic_pos: 'theirs', reflexive: 'themselves'}
  };

  // onLoad

  var oldGameSystem_onAfterLoad = Game_System.prototype.onAfterLoad;
  Game_System.prototype.onAfterLoad = function() {
    oldGameSystem_onAfterLoad.call(this);

    autoRun();
  };

  // PLugin commands

  var aliasPluginCommand = Game_Interpreter.prototype.pluginCommand;

  Game_Interpreter.prototype.pluginCommand = function(command, args) 
  {
     aliasPluginCommand.call(this, command, args);
    if (command === 'PottySystem')
    {
      switch(args[0].toLowerCase())
      {
      case 'debug': // for debugging
        debug();
        break;
      case 'main': // for debugging
        main();
        break;
      case 'initialize':
        init();
        break;
      case 'start':
        !running && start();
        break;
      case 'stop':
        halt();
        break;
      case 'wet':
        wet();
        break;
      case 'mess':
        mess();
        break;
      case 'setwear':
        setWear(parseInteger(args[1],current_wear>>FLAGCOUNT));
        break;
      case 'setgender':
        setGender(parseInteger(args[1], gender));
        break;
      case 'setneedwet':
        setNeedWet(args[1],true);
        break;
      case 'setneedmess':
        setNeedMess(args[1],true);
        break;
      case 'setwet':
        setWet(boolEval(args[1]));
        break;
      case 'setmessy':
        setMessy(boolEval(args[1]));
        break;
      case 'setclean':
        setClean();
        break;
      case 'iswet':
        setSwitch(Number(args[1]), isWet(current_wear));
        break;
      case 'ismessy':
        setSwitch(Number(args[1]), isMessy(current_wear));
        break;
      default:
        $gameMessage.add('PottySystem ' + args[0] + ' is an unknown command');
        break;
      }
    }
  };

  // ===== Common functions ===================================================

  // == Utilities =============================================================

  function parseInteger(num, def)
  {
    return isInt(num) ? Number(num) : def;
  }

  function chance(perc) 
  {
    return (rnd(99) < perc);
  }

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

  function evalBool(b)
  {
    return typeof b === 'undefined' || b.toLowerCase() === 'false' || b === '0' ? false : true;
  }

  function isInt(n)
  {
    return Number(n) !== NaN && n % 1 === 0;
  }

  function getSwitch(n)
  {
    return JSON.stringify($gameSwitches._data[n]) === 'true';
  }

  function getVar(num)
  {
    return $gameVariables.value(num);
  }

  function getArmor(wear, gndr)
  {
    gndr = typeof gndr === "undefined" ? gender : gndr;
    wear = typeof wear === "undefined" ? current_wear : wear;

    return $dataArmors[armorId[gndr] + wear];
  }

  function setSwitch(n, value)
  {
    if (isInt(n))
    {
      $gameSwitches.setValue(n, value);
    } else {
      console.log('switch: ' + n + ' must be an whole number.');
    }
  }

  function setVar(n, value)
  {
    if (isInt(n) && isInt(value))
    {
      $gameVariables.setValue(n,Number(value));
    }
  }

  function setFlag(obj, flag, set)
  {
    return (set ? obj | flag : obj & ~flag);
  }

  // == Getters ===============================================================

  function isWet(wear)
  {
    wear = wear || current_wear;
    return ((wear & WET) > 0);
  }

  function isMessy(wear)
  {
    wear = wear || current_wear;
    return ((wear & MESSY) > 0);
  }

  function isUndies(wear)
  {
    wear = wear || current_wear;
    return (wear>>FLAGCOUNT === 0);
  }

  function isPullups(wear)
  {
    wear = wear || current_wear;
    return (wear>>FLAGCOUNT === 1);
  }

  function isDiapers(wear)
  {
    wear = wear || current_wear;
    return (wear>>FLAGCOUNT === 2);
  }

  // == Setters ===============================================================

  e.setTrain = function(x)
  {
    trainW = x;
    trainM = x;
  }

  function setGender(gndr)
  {
    gender = gndr;
    setVar(11,gender); //changing gender breaks changeUnderwear
  }

  function setWear(wear, preserveState)
  {
    if (typeof preserveState !== 'undefined' && preserveState === true)
    {
      wear = wear | (current_wear & (WET | MESSY));
    }

    wearVar && $gameVariables.setValue(wearVar, wear<<FLAGCOUNT);
    changeUnderwear(wear<<FLAGCOUNT);
  }

  function setNeedWet(need, rel)
  {
    if ((typeof rel !== 'undefined' && rel === true) || 
        typeof need === 'string' && 
        (need.charAt(0) == '+' || need.charAt(0) == '-'))
    {
      needW += Number(need);
    } else {
      needW = Number(need);
    }

    setVar(19,needW);
  }

  function setNeedMess(need, rel)
  {
    if ((typeof rel !== 'undefined' && rel === true) || 
        typeof need === 'string' && 
        (need.charAt(0) == '+' || need.charAt(0) == '-'))
    {
      needM += Number(need);
    } else {
      needM = Number(need);
    }

    setVar(18,needM);
  }

  function changeUnderwear(newWear)
  {
    console.log(newWear);
    var oldArmor = getArmor();
    current_wear = newWear;
    setVar(20, current_wear);
    var newArmor = getArmor();
    $gameParty.gainItem(newArmor,1, true);
    $gameParty.leader().changeEquip(4,newArmor); //hardcoded slot
    $gameParty.gainItem(oldArmor,-1,true);

  }

  function setWet(set, wear)
  {
    var old_wear = current_wear;
    set = typeof set !== 'undefined' ? set : true;
    var toSet = wear || current_wear;
    toSet = setFlag(toSet, WET, set);
    if (typeof wear === 'undefined')
    {
      changeUnderwear(toSet);
      wetSwitch && setSwitch(wetSwitch, set);
    } else {
      return toSet;
    }
  }

  function setMessy(set, wear)
  {
    set = typeof set !== 'undefined' ? set : true;
    var toSet = wear || current_wear;
    toSet = setFlag(toSet, MESSY, set);
    if (typeof wear === 'undefined')
    {
      changeUnderwear(toSet);
      messySwitch && setSwitch(messySwitch, set);
    } else {
      return toSet;
    }
  }
  function setClean(wear)
  {
    var toSet = wear | current_wear;
    toSet = setFlag(toSet, WET | MESSY, false);
    if (typeof wear === 'undefined')
    {
      changeUnderwear(toSet);
      wetSwitch && setSwitch(wetSwitch, false);
      messySwitch && setSwitch(messySwitch, false);
    } else {
      return toSet;
    }
  }

  // == Events ================================================================

  function feel(type)
  {
    var rtn = {wet: false, messy: false};
    if (type & WET)
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

    if (type & MESSY)
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

  function wet() 
  {
    setNeedWet(0);
    setWet();
    //console.log('Oops! *wets*');
  }

  function mess()
  {
    setNeedMess(0);
    setMessy();
    //console.log('Oops! *messes*');
  }

  // == Main ==================================================================

  function init()
  {
    setSwitch(19, false);
    halt();
    autoRun();
  }

  function autoRun()
  {
    console.log('autorun');
    var startRunning = evalBool(params['startRunning']) || true;

    startRunning = false;

    timer = params['timer'] || 20;
    timer =   parseInteger(timer, 20) * 1000;

    timer = 500;

    wetSwitch   = params['wetSwitch']    || 0;
    wetSwitch   =   parseInteger(wetSwitch, 0);
    messySwitch = params['messySwitch']  || 0;
    messySwitch =   parseInteger(messySwitch, 0);
    wearVar     = params['underwearVar'] || 0;
    wearVar     =   parseInteger(wearVar, 0);

    armorId[0] = params['equimentId'] || 0;
    armorId[0] =   parseInteger(armorId[0], 0);
    armorId[1] = params['idOffsetFemale'] || 0;
    armorId[1] =   parseInteger(armorId[1], 0) + armorId[0];
    armorId[2] = params['idOffsetGeneric'] || 0;
    armorId[3] =   parseInteger(armorId[2], 0) + armorId[0];

    underwearSlot = params['underwearSlot'] || 5;
    underwearSlot =   parseInteger(underwearSlot, 5)-1;
    
    if (!getSwitch(19))
    {
      console.log('init');

      needW = 0;
      needM = 0;

      holdW = params['holdW'] || 100;
      holdW =   parseInteger(holdW, 100);
      holdM = params['holdM'] || 150;
      holdM =   parseInteger(holdM, 150);

      trainW = params['trainW'] || 40;
      trainW =   parseInteger(trainW, 40);
      trainM = params['trainM'] || 40;
      trainM =   parseInteger(trainM, 40);

      incW = params['wetInc']  || 5;
      incW =   parseInteger(incW, 5);
      incM = params['messInc'] || 5;
      incM =   parseInteger(incM, 5);

      current_wear = params['defaultWear'] || 0;
      current_wear =   parseInteger(current_wear, 0)<<FLAGCOUNT;

      gender = params['defaultGender'];

      setSwitch(19, true);
      setVar(20, current_wear);
      setVar(19, needW);
      setVar(18, needM);
      setVar(17, holdW);
      setVar(16, holdM);
      setVar(15, trainW);
      setVar(14, trainM);
      setVar(13, incW );
      setVar(12, incM );
      setVar(11, gender);

      if (startRunning)
      {
        start();
      }
    } else {
      console.log('Already Loaded');
      if (getSwitch(20) !== running)
      {
        !running && start() || running && halt();
      }

      current_wear = getVar(20);
      needW        = getVar(19);
      needM        = getVar(18);
      holdW        = getVar(17);
      holdM        = getVar(16);
      trainW       = getVar(15);
      trainM       = getVar(14);
      incW         = getVar(13);
      incM         = getVar(12);
      gender       = getVar(11);
    }

  }

  function start()
  {
    setSwitch(20, true);
    (running = true) && (loop = 'pending') && main();
    // console.log('Start: ' + running + ' ' + loop);

    return true; // Or it will be killed in the autoRun fn.
  }

  function halt()
  {
    if (loop !== null)
    {
      clearTimeout(loop)
      loop = null;
      running = false;
    }
    if (loop === 'pending')
    {
      setTimeout(halt, 1000);
    }

    // console.log('Halt: ' + running + ' ' + loop);
  }

  function main()
  {
    // Increase need
    setNeedWet (rnd(1,incW),true);
    setNeedMess(rnd(1,incM),true);

    // Check if feel
    feel(WET | MESSY);

    // Check if accident

    if (needW > holdW) {wet();}
    if (needM > holdM) {mess();}

    // Reset loop
    loop = setTimeout(main, timer);
  }


  // == Debug =================================================================

  e.debug = function(x)
  {

    halt();

    e.setTrain(x);
    debug();
    512
    var stat = {feelW: 0, feelM: 0, wet: 0, messy: 0, wCount: [], mCount: []};
    var wCount = 0;
    var mCount = 0;

    for (var i=0; i<1000000; i++)
    {
      setNeedWet(rnd(1,incW),true);
      setNeedMess(rnd(1,incM),true);


      if (needW > holdW) {wet(); stat.wet++; stat.wCount.push(wCount); wCount = 0;}
      if (needM > holdM) {mess(); stat.messy++; stat.mCount.push(mCount); mCount = 0;}

      var rtn = feel(WET | MESSY);

      if (wCount !== 0) {wCount++;}
      if (mCount !== 0) {mCount++;}

      if (rtn.wet) {stat.feelW++;}
      if (rtn.messy) {stat.feelM++;}

      if (rtn.wet && wCount === 0) {wCount++;}
      if (rtn.messy && mCount === 0) {mCount++;}

    }

    var wCountSum = 0;
    var wNoWarn = 0;
    for (var i = stat.wCount.length - 1; i >= 0; i--) {
      wCountSum += stat.wCount[i];
      if (stat.wCount[i] === 0) {wNoWarn++;}
    };

    var wCountAve = wCountSum/stat.wCount.length;

    var mCountSum = 0;
    var mNoWarn = 0;
    for (var i = stat.mCount.length - 1; i >= 0; i--) {
      mCountSum += stat.mCount[i];
      if (stat.mCount[i] === 0) {mNoWarn++;}
    };

    var mCountAve = wCountSum/stat.mCount.length;

    //console.log('wet feel: ' + stat.feelW + ' accidents: ' + stat.wet + " f/a: " + (stat.feelW/stat.wet).toFixed(4) + ' aveCount: ' + wCountAve.toFixed(4) + " noWarn: " + wNoWarn + "(" + (wNoWarn*100/stat.wet).toFixed(1) + "%)");
    //console.log('mess feel: ' + stat.feelM + ' accidents: ' + stat.messy + " f/a: " + (stat.feelM/stat.messy).toFixed(4) + ' aveCount: ' + mCountAve.toFixed(4) + " noWarn: " + mNoWarn + "(" + (mNoWarn*100/stat.messy).toFixed(1) + "%)");
    console.log(x + ': wet: ' + (wNoWarn*100/stat.wet).toFixed(1) + ' mess: ' + (mNoWarn*100/stat.messy).toFixed(1) + "%");
    stat = null;
    wNoWarn = null;
    mNoWarn = null;
    wCount = null;
    mCount = null;
    wCountSum = null;
    mCountSum = null;
    mCountAve = null;
    wCountAve = null;
    

    start();
  }

  function debug()
  {
    //console.log(getVar(2));

  }

  console.log('PottySystem Loaded.');

})(external);