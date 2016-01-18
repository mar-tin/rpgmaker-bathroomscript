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
 * @param wetEvent
 * @desc Common event to call when there is a wetting accident
 * 
 * @param messEvent
 * @desc Common event to call when there is a messing accident
 *
 * @param equimentId
 * @desc Number of the first underwear (Clean Undies) See help.
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
 * @default 0
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
 * PottySystem init
 * Initialize the pottysystem the first time, needs to be run once when a new
 * game is started
 * 
 * PottySystem start
 * Starts the main loop at the set time interval.
 * 
 * PottySystem stop
 * Stops the main loop. All commands will still work but bladder won't fill, it 
 * won't trigger automaticlly feeling the need to go and having accidents.
 * 
 * PottySystem accident <wet/messy>
 * Trigger a wet or messy accident.
 * 
 * PottySystem setWear <type>
 * Set current type of underwear: 
 * 0 = undies, 1 = pullups, 2 = diapers
 * 
 * PottySystem setNeed <wet/messy> <need>
 * Set or change the current need to pee or poop. 
 * To set enter a number, to change use + or - as the first character.
 * 
 * PottySystem setState <wet/messy/clean> [boolean]
 * Change the current state of the underwear to be or no longer be wet or messy
 * If no value is provided true is assumed. valid values: true,false,0,1
 * 
 * PottySystem isState <wet/messy> <switch>
 * Sets the provided switch number to the current state.
 * 
 * PottySystem setGender [gender]
 * Sets the gender of the character with respect to this script. Changes the 
 * items and pronouns used.
 */
//===============================================================================;

(function()
{
  'use strict';

  var params = PluginManager.parameters('PottySystem');

  var loop = null;
  
  var stateSwitch, armorId, timer, wearVar, underwearSlot, events;
  var $ = {};

  const FLAGCOUNT = 2; // number of states

  const STATE_WET  = 1<<0;     // 0x1
  const STATE_MESSY = 1<<1;    // 0x2

  const WEAR_UNDIES  = 0<<FLAGCOUNT; // 0
  const WEAR_PULLUPS = 1<<FLAGCOUNT; // 4
  const WEAR_DIAPERS = 2<<FLAGCOUNT; // 8

  const PRONOUNS = {
    male: {subject: 'he', object: 'him', prenom_pos: 'his', predic_pos: 'his', reflexive: 'himself'},
    female: {subject: 'she', object: 'her', prenom_pos: 'her', predic_pos: 'hers', reflexive: 'herself'},
    neutral: {subject: 'they', object: 'them', prenom_pos: 'their', predic_pos: 'theirs', reflexive: 'themselves'}
  };

  // onRun

  var oldGameSystem_onafterload = Game_System.prototype.onAfterLoad;
  Game_System.prototype.onAfterLoad = function() {
    oldGameSystem_onafterload.call(this);
    autoRun();
  };

  // PLugin commands

  var aliasPluginCommand = Game_Interpreter.prototype.pluginCommand;

  Game_Interpreter.prototype.pluginCommand = function(command, args) 
  {
    aliasPluginCommand.call(this, command, args);
    if (command === 'PottySystem')
    {
      let state = 0;
      if (typeof args[1] !== 'undefined' && args[1].toLowerCase() === 'wet') 
      {
        state = STATE_WET;
      }
      if (typeof args[1] !== 'undefined' && 
          (args[1].toLowerCase() === 'messy' || 
           args[1].toLowerCase() === 'mess')) 
      {
        state = STATE_MESSY;
      }
      switch(args[0].toLowerCase())
      {
      case 'debug': // for debugging
        debug();
        break;
      case 'main': // for debugging
        main();
        break;
      case 'register':
        register(args.slice(1));
        break;
      case 'start':
        !$.system.running && start();
        break;
      case 'stop':
        halt();
        break;
      case 'accident':
        accident(state);
        break;
      case 'setwear':
        setWear(parseInteger(args[1],$.system.currentWear>>FLAGCOUNT));
        break;
      case 'setneed':
        setNeed(state,args[2],true); // to sanitize
        break;
      case 'sethold':
        setHold(state,args[2]); // to sanitize
        break;
      case 'settrain':
        setTrain(state,args[2]); // to sanitize
        break;
      case 'setinc':
        setInc(state,args[2]); // to sanitize
        break;
      case 'setstate':
        if (state !== 0) {setState(state, evalBool(args[2]));}
        else if(args[1].toLowerCase() === 'clean') 
        {
          setState(STATE_WET | STATE_MESSY, false);
        }
        break;
      case 'isstate':
        if (parseInteger(args[2],0) > 0) 
        {
          setSwitch(parseInt(args[2]), isState(state));
        }
        break;
      case 'setgender':
        setGender(parseInteger(args[1], $.system.gender));
        break;
      default:
        $gameMessage.add('PottySystem ' + args[0] + ' is an unknown command');
        break;
      }
    }
  };

  // ===== Common functions ===================================================

  // == Utilities =============================================================

  // Deal with Input

  function defValue(val,def)
  {
    return (typeof val !== 'undefined') ? val : def;
  }

  function isInt(n)
  {
    return !isNaN(Number(n)) && n % 1 === 0;
  }

  function parseInteger(num, def)
  {
    return isInt(num) ? Number(num) : def;
  }

  function evalBool(b)
  {
    if (typeof b !== 'undefined' && (b.toLowerCase() === 'false' || b === '0'))
    {
      return false;
    } else {
      return true;
    }
  }

  // Random

  function chance(perc)
  {
    return (rnd(99) < perc);
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

  function getFeelReq(need)
  {
    // lookup on a polinomial curve capped at 1.
    if (need < 0.10446)
    {
      return 1;
    } else if (need > 1) {
      return 0.1;
    } else {
      // p are values for the polynomial;
      let p = [];
      p[4] =  5.755;
      p[3] = -10.619;
      p[2] =  4.984;
      p[1] = -1.091;
      p[0] =  1.071;
      return p[4] * Math.pow(need, 4) + p[3] * Math.pow(need, 3) + p[2] * Math.pow(need, 2) + p[1] * need + p[0];
    }
  }

  function getFeelRnd(train)
  {
    var t = train/100;
    return Math.pow(Math.random(), 1.5 * (1-Math.pow(t, 2)) + 0.5) * (0.9 * t + 0.1);
  }

  // Game Variables and Switches

  function getSwitch(n)
  {
    return JSON.stringify($gameSwitches._data[n]) === 'true';
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

  function getVar(num)
  {
    return $gameVariables.value(num);
  }

  function setVar(n, value)
  {
    if (isInt(n) && isInt(value))
    {
      $gameVariables.setValue(n,Number(value));
    }
  }

  function getArmor(wear, gndr)
  {
    if(typeof wear === 'undefined')
    {
      return $gameParty.leader().equips()[underwearSlot];
    }

    gndr = defValue(gndr, $.system.gender);

    return $dataArmors[armorId[gndr] + wear];
  }

  // Set and unset flags on objects

  function setFlag(obj, flag, set)
  {
    return (set ? obj | flag : obj & ~flag);
  }

  // == Getters ===============================================================

  function isState(state, wear)
  {
    wear = defValue(wear, $.system.currentWear);
    return((wear & state) === state);
  }

  function isUnderwear(type, wear)
  {
    wear = defValue(wear, $.system.currentWear);
    return (type>>FLAGCOUNT === wear>>FLAGCOUNT);
  }

  // == Setters ===============================================================

  function setGender(gndr)
  {
    $.system.gender = gndr;
    setVar(11,$.system.gender); //changing gender breaks changeUnderwear
  }

  function setWear(wear, preserveState)
  {
    if (typeof preserveState !== 'undefined' && preserveState === true)
    {
      wear = wear | ($.system.currentWear & (STATE_WET | STATE_MESSY));
    }

    wearVar && $gameVariables.setValue(wearVar, wear<<FLAGCOUNT);
    changeUnderwear(wear<<FLAGCOUNT);
  }

  function setNeed(state, nd, rel)
  {
    if ((typeof rel !== 'undefined' && rel === true) || 
        typeof nd === 'string' && 
        (nd.charAt(0) == '+' || nd.charAt(0) == '-'))
    {
      $.system.need[state] += Number(nd);
    } else {
      $.system.need[state] = Number(nd);
    }
  }

  function setHold(state, hold)
  {
    $.system.hold[state] = hold;
  }

  function setTrain(state, train)
  {
    $.system.train[state] = train;
  }

  function setInc(state, inc)
  {
    $.system.inc[state] = inc;
  }

  function changeUnderwear(newWear)
  {
    // if all flags are cleared we treat it as a change wearGender is updated
    // if not then the wearGender is kept the same so it's not changed when
    // having an accident.
    if ((newWear & (1<<FLAGCOUNT) -1) === 0)
    {
      $.system.genderWear = $.system.gender;
    }
    $.system.currentWear = newWear;
    setVar(20, $.system.currentWear);
    var oldArmor = getArmor();
    var newArmor = getArmor(newWear, $.system.genderWear);
    $gameParty.gainItem(newArmor,1, true);
    $gameParty.leader().changeEquip(underwearSlot,newArmor);
    $gameParty.gainItem(oldArmor,-1,true);
  }

  function setState(state, set, wear)
  {
    set = defValue(set, true);
    var toSet = defValue(wear, $.system.currentWear);
    toSet = setFlag(toSet, state, set);
    if (typeof wear === 'undefined')
    {
      changeUnderwear(toSet);
      stateSwitch[STATE_WET] && setSwitch(stateSwitch(STATE_WET), set);
      stateSwitch[STATE_MESSY] && setSwitch(stateSwitch(STATE_MESSY), set);
    } else {
      return toSet;
    }
  }

  // == Messages ==============================================================

  // == Events ================================================================

  function feel(type)
  {

    for(let stateBit = 0; stateBit<FLAGCOUNT; stateBit++)
    {
      let state = 1<<stateBit;
      if (type & state)
      {
        if (getFeelReq($.system.need[state]/$.system.hold[state]) < getFeelRnd($.system.train[state]))
        {
          //console.log(`I have to ${state}`);
        }
      }
    }
  }

  function accident(state)
  {
    setNeed(state, 0);
    setState(state);
    $gameTemp.reserveCommonEvent(events[state]);
  }

  // == Main ==================================================================

  function register(args)
  {
    var actors = [];
    if(args.length == 0)
    {
      actors = $gameParty._actors;
    } else {
      args.forEach(function(val)
      {
        let clean = val.replace(/\W/g, '').toLowerCase();
        if (clean !== '' && (isInt(clean) || clean == 'l'))
        {
          actors.push(clean);
        }
      });

    }
  }

  function autoRun()
  {
    console.log('autorun');

    if($gameSystem === null)
    {
      return 1; //not in a game
    }

    if(typeof $gameSystem._pottySystem === 'undefined')
    {
      $gameSystem._pottySystem =  {init: false, running: false, actors: 0, need: [], hold: [], train: [], inc: []};
    }
    $.system = $gameSystem._pottySystem;
    $.actors = [];
    $gameActors._data.forEach(function(val, index, array)
    {
      if(val !== null && typeof val._pottySystem !== 'undefined')
      {
        $.actors.push($gameActors._data[index]._pottySystem);
      } else {
        $.actors.push(null);
      }
    });


    //temp
    if(typeof $gameSystem._pottySystem.need == 'undefined')
    {
      $.system.need = [];
      $.system.hold = [];
      $.system.train = [];
      $.system.inc = [];
    }

    var startRunning = evalBool(params['startRunning']);

    timer = (!isNaN(params['timer']) ? params['timer'] : 20) * 1000;

    stateSwitch = [];
    stateSwitch[STATE_WET]   = parseInteger(params['wetSwitch'], 0);
    stateSwitch[STATE_MESSY] = parseInteger(params['messySwitch'], 0);
    wearVar                  = parseInteger(params['underwearVar'], 0);

    events = [];
    events[STATE_WET] = parseInteger(params['wetEvent']);
    events[STATE_MESSY] = parseInteger(params['messEvent']);

    armorId = [];
    armorId[0] = parseInteger(params['equimentId'], 0);
    armorId[1] = parseInteger(params['idOffsetFemale'], 0) + armorId[0];
    armorId[2] = parseInteger(params['idOffsetGeneric'], 0) + armorId[0];

    underwearSlot = parseInteger(params['underwearSlot'], 5)-1;
    if (underwearSlot === -1) {console.log('underwearSlot could not be read,' + 
        ' please check and make sure it\'s only a number');}

    if (!$.system.init)
    {
      console.log('init');
      console.log($.system);
      $.system.init = true;

      $.system.need[STATE_WET] = 0;
      $.system.need[STATE_MESSY] = 0;

      $.system.hold[STATE_WET] = parseInteger(params['holdW'], 100);
      $.system.hold[STATE_MESSY] = parseInteger(params['holdM'], 150);

      $.system.train[STATE_WET] = parseInteger(params['trainW'], 40);
      $.system.train[STATE_MESSY] = parseInteger(params['trainM'], 40);

      $.system.inc[STATE_WET] = parseInteger(params['wetInc'], 5);
      $.system.inc[STATE_MESSY] = parseInteger(params['messInc'], 5);

      $.system.currentWear = parseInteger(params['defaultWear'], 0)<<FLAGCOUNT;

      $.system.gender = parseInteger(params['defaultGender'],0);
      $.system.genderWear = $.system.gender;


      if (startRunning)
      {
        start();
      }
    } else {
      console.log('Already Loaded');
      if (loop == null)
      {
        !$.system.running && start() || $.system.running && halt();
      }

    }

  }

  function start()
  {
    if(loop == null)
    {
      (loop = 'pending') && ($.system.running = true) && main();    
    }
    // console.log('Start: ' + $.system.running + ' ' + loop);

    return true; // Or it will be killed in the autoRun fn.
  }

  function halt()
  {
    if (loop !== null)
    {
      clearTimeout(loop);
      $.system.running = false;
      loop = null;
    }
    if (loop === 'pending')
    {
      setTimeout(halt, 1000);
    }

    // console.log('Halt: ' + $.system.running + ' ' + loop);
  }

  function main()
  {
    // Increase need
    setNeed(STATE_WET,rnd(1,$.system.inc[STATE_WET]),true);
    setNeed(STATE_MESSY,rnd(1,$.system.inc[STATE_MESSY]),true);

    // Check if feel
    feel(STATE_WET | STATE_MESSY);

    // Check if accident

    if ($.system.need[STATE_WET] > $.system.hold[STATE_WET]) {accident(STATE_WET);}
    if ($.system.need[STATE_MESSY] > $.system.hold[STATE_MESSY]) {accident(STATE_MESSY);}

    // Re-set loop if loop is not halted (stop zombies after halt)
    loop !== null && (loop = setTimeout(main, timer));
  }


  // == Debug =================================================================

  function debug()
  {
    

  }

  console.log('PottySystem Loaded.');

})();
