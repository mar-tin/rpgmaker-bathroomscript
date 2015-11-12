//=============================================================================
 /*:
 * @plugindesc Potty System
 * @author Me
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
 * @defalut 0
 * 
 * @param timer
 * @desc How often the main loops needs to be repeated. Seconds 
 * between loops.
 * @default 20
 * 
 * @param startRunning
 * @desc Start the game with the timer runnung
 * @default true
 * 
 * @param holdW
 * @desc how much pee can be held by default. Will only be used
 * At the start of the game after that it can be changed with commands
 * @default 100
 * 
 * @param holdM
 * @desc how much poop can be held by default. Will only be used
 * At the start of the game after that it can be changed with commands
 * @default 150
 * 
 * @param wetInc
 * @desc how much max (random number between 0 and this number) to 
 * add each loop to the need to pee.
 * @default 5
 * 
 * @param messInc
 * @desc how much max (random number between 0 and this number) to 
 * add each loop to the need to poop.
 * @default 5
 * 
 * @help
 * Commands:
 * 
 * <> is mandatory input
 * [] is optional input
 * 
 * PottyScript setWear <type>
 * Set current type of underwear: 
 * 0 = undies, 1 = pullups, 2 = diapers
 * 
 * PottyScript setNeedWet <need>
 * Set or change the current need to pee. 
 * To set enter a number, to change use + or - as the first character.
 * 
 * PottyScript setNeedMess <need>
 * Set or change the current need to poop.
 * To set enter a number, to change use + or - as the first character.
 * 
 * PottyScrip setWet [boolean]
 * Change the current state of the underwear to be or no longer be wet
 * If no value is provided true is assumed. valid values: true,false,0,1
 * 
 * PottyScrip setMessy [boolean]
 * Change the current state of the underwear to be or no longer be messy
 * If no value is provided true is assumed. valid values: true,false,0,1
 * 
 * PottyScript isWet <switch>
 * Sets the provided switch number to the current wetness state.
 * 
 * PottyScript isMessy <switch>
 * Sets the provided switch number to the current messyness state.
 */
//=============================================================================


(function() 
{

	params = PluginManager.parameters('PottySystem');

	running = false;
	loop = "blocked";

	var current_wear, needW, needM, holdW, holdM, incW, incM;

	flagCount = 2

	wet  = 1<<0;     // 0x1
	messy = 1<<1;    // 0x2

	undies  = 0<<flagCount; // 0
	pullups = 1<<flagCount; // 4
	diapers = 2<<flagCount; // 8

	pronouns = {male:   {subject: "he"  , object: "him" , prenom_pos: "his"  , predic_pos: "his"   , reflexive: "himself"},
				female: {subject: "she" , object: "her" , prenom_pos: "her"  , predic_pos: "hers"  , reflexive: "herself"},
				neutral:{subject: "they", object: "them", prenom_pos: "their", predic_pos: "theirs", reflexive: "themselves"}}


	// PLugin commands

	var aliasPluginCommand = Game_Interpreter.prototype.pluginCommand;

	Game_Interpreter.prototype.pluginCommand = function(command, args) 
	{
	   aliasPluginCommand.call(this, command, args);
		if (command === 'PottySystem')
		{
			switch(args[0].toLowerCase())
			{
			case 'debug':
				debug();
				break;
			case 'autorun':
				autoRun(this);
				break;
			case 'start':
				!running && start();
				break;
			case 'stop':
				stop();
				break;
			case 'setwear':
				setWear(args[1])
				break;
			case 'setneedwet':
				setNeedWet(args[1],true)
				break;
			case 'setneedmess':
				setNeedMess(args[1],true)
				break;
			case 'setwet':
				setWet(boolEval(args[1]));
				break;
			case 'setmessy':
				setMessy(boolEval(args[1]));
				break;
			case 'setclean':
				setClean(boolEval(args[1]));
				break;
			case 'iswet':
				setSwitch(Number(args[1]), isWet(current_wear));
				break;
			case 'ismessy':
				setSwitch(Number(args[1]), isMessy(current_wear));
				break;
			case 'main':
				main();
				break;
			default:
				$gameMessage.add("PottySystem " + args[0] + " is an unknown command");
				break;
			}
		}
	};

	// ===== Common functions =================================================

	// == Utilities ===========================================================

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
		return (need < 0.10215 || need > 1) ? 0 : 4.545 * Math.pow(need, 4) -9.172 * Math.pow(need, 3) +4.847 * Math.pow(need, 2) -1.207 * need +1.082;
	}

	function getFeelRnd(train)
	{
		Math.pow(Math.random(), 1.5 * (1-Math.pow(train, 2)) + 0.5) * (0.9 * train + 0.1);
	}

	function rnd(a,b)
	{
		if(typeof b === "undefined")
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
		return typeof b === "undefined" || b.toLowerCase() === "false" || b === "0" ? false : true;
	}

	function isInt(n)
	{
		return Number(n) !== NaN && n % 1 === 0;
	}

	function getSwitch(n)
	{
		return JSON.stringify($gameSwitches._data[n]) === "true";
	}

	function getVar(num)
	{
		return Number(JSON.stringify($gameVariables._data[num]));
	}

	function setSwitch(n, value)
	{
		if(isInt(n))
		{
			$gameSwitches.setValue(n, value);
		} else {
			console.log("switch: " + n + " must be an whole number.");
		}
	}

	function setVar(n, value)
	{
		if(isInt(n) && isInt(value))
		{
			$gameVariables.setValue(n,Number(value));
		}
	}

	function setFlag(obj, flag, set)
	{
		return (set ? obj | flag : obj & ~flag);
	}

	// == Getters =============================================================

	function isWet(wear)
	{
		wear = wear || current_wear;
		return ((wear & wet) > 0);
	}

	function isMessy(wear)
	{
		wear = wear || current_wear;
		return ((wear & messy) > 0);
	}

	function isUndies(wear)
	{
		wear = wear || current_wear;
		return (wear>>flagCount === 0);
	}

	function isPullups(wear)
	{
		wear = wear || current_wear;
		return (wear>>flagCount === 1);
	}

	function isDiapers(wear)
	{
		wear = wear || current_wear;
		return (wear>>flagCount === 2);
	}

	// == Setters =============================================================

	function setWear(wear, preserveState)
	{
		if(typeof preserveState !== "undefined" && preserveState === true)
		{
			wear = wear | (current_wear & (wet | messy));
		}

		wearVar && $gameVariables.setValue(wearVar, wear>>flagCount);
		current_wear = wear;
	}

	function setNeedWet(need, rel)
	{
		if((typeof rel !== "undefined" && rel === true) || 
			typeof need === "string" && 
			(need.charAt(0) == "+" || need.charAt(0) == "-"))
		{
			needW += Number(need);
		} else {
			needW = Number(need);
		}

		console.log(need + " " + needW);
		setVar(19,needW);
	}

	function setNeedMess(need, rel)
	{
		if((typeof rel !== "undefined" && rel === true) || 
			typeof need === "string" && 
			(need.charAt(0) == "+" || need.charAt(0) == "-"))
		{
			needM += Number(need);
		} else {
			needM = Number(need);
		}

		setVar(18,needM);
	}

	function setWet(set, wear)
	{
		set = typeof set !== "undefined" ? set : true;
		toSet = wear || current_wear;
		toSet = setFlag(toSet, wet, set);
		if(typeof wear === "undefined")
		{
			wetSwitch && setSwitch(wetSwitch, set);
			current_wear = toSet;
		} else {
			return toSet;
		}
	}

	function setMessy(set, wear)
	{
		set = typeof set !== "undefined" ? set : true;
		toSet = wear || current_wear;
		toSet = setFlag(toSet, messy, set);
		if(typeof wear === "undefined")
		{
			messySwitch && setSwitch(messySwitch, set);
			current_wear = toSet;
		} else {
			return toSet;
		}
	}
	function setClean(wear)
	{
		toSet = wear | current_wear;
		toSet = setFlag(toSet, wet | messy, false);
		if(typeof wear === "undefined")
		{
			wetSwitch && setSwitch(wetSwitch, false);
			messySwitch && setSwitch(messySwitch, false);
			current_wear = toSet;
		} else {
			return toSet;
		}
	}

	// == Events ==============================================================

	// == Main ================================================================

	function autoRun(event)
	{
		$gameMap.eraseEvent(event._eventId);
		startRunning = evalBool(params['startRunning']) || true;

		timer = params['timer'] || 20;
		timer =   parseInteger(timer, 20) * 1000;

		wetSwitch   = params['wetSwitch']    || 0;
		wetSwitch   =   parseInteger(wetSwitch, 0);
		messySwitch = params['messySwitch']  || 0;
		messySwitch =   parseInteger(messySwitch, 0);
		wearVar     = params['underwearVar'] || 0;
		wearVar     =   parseInteger(wearVar, 0);
		
		if(!getSwitch(19))
		{

			needW = 0;
			needM = 0;

			holdW = params['holdW'] || 100;
			holdW =   parseInteger(holdW, 100);
			holdM = params['holdM'] || 150;
			holdM =   parseInteger(holdM, 150);

			incW = params['wetInc']  || 5;
			incW =   parseInteger(incW, 5);
			incM = params['messInc'] || 5;
			incM =   parseInteger(incM, 5);

			current_wear = params['defaultWear'] || 0;
			current_wear =   parseInteger(current_wear, 0)<<flagCount;

			setSwitch(19, true);
			setVar(20, current_wear);
			setVar(19, needW);
			setVar(18, needM);
			setVar(17, holdW);
			setVar(16, holdM);
			setVar(15, incW );
			setVar(14, incM );

			if(startRunning)
			{
				start();
			}
		} else {
			if(getSwitch(20) !== running)
			{
				console.log(running + " " + getSwitch(20))
				!running && start() || running && halt();
			}

			current_wear = getVar(20);
			needW        = getVar(19);
			needM        = getVar(18);
			holdW        = getVar(17);
			holdM        = getVar(16);
			incW         = getVar(15);
			incM         = getVar(14);
		}

	}

	function start()
	{
		setSwitch(20, true);
		(running = true) && (loop = "pending") && main();
		console.log("Start: " + running + " " + loop);

		return true; // Or it will be killed in the autoRun fn.
	}

	function halt()
	{
		loop !== null && clearTimeout(loop) && (loop = null) && (running = false);
		if(loop === "pending")
		{
			setTimeout(halt, 1000);
		}

		console.log("Halt: " + running + " " + loop);
	}

	function main()
	{
		// Increase need
		setNeedWet (rnd(1,incW),true);
		setNeedMess(rnd(1,incM),true);

		// Check if feel

		// Check if accident

		// Reset loop
		loop = setTimeout(main, timer);
	}


	// == Debug ===============================================================

	function debug()
	{

		console.log(typeof startRunning + ": " + startRunning + ", " + running);

	}

	console.log("PottySystem Loaded.");

})();