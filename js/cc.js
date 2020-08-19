var regions, regionalData, cutoffScore;

$(document).ready(function(){

	// Region Selection
	Papa.parse('locales.csv?20200818114840', {
		complete: function(results) {
			regions = results.data;

			var regionArray = _.sortBy(_.map(_.filter(regions,{ "Province_State": "" }),'Country_Region')), 
					regionListHtml = '<option></option>';

			regionArray.forEach(function(data,index){
				regionListHtml = data === "US" ? regionListHtml + '<option value="'+data+'">United States</option>': regionListHtml + '<option value="'+data+'">'+data.replace('*','')+'</option>';
			});

			$('#countries').html(regionListHtml);

			var country, state, county;

			$('#countries').on('change',function(){
				country = $(this).val();

				// Show user the units they'll be familiar with
				if ( country === "US" ){
					$('#spaceExact').prop('placeholder',"Square feet");
				} else {
					$('#spaceExact').prop('placeholder',"Square meters")
				}

				// If there are states for this country/region, show them
				var stateArray  = _.sortBy(_.map(_.filter(regions,{ "Country_Region": country, "Admin2" : "" }),'Province_State'));
				if ( stateArray && stateArray.length > 1 ){
					var stateListHtml = '';
					stateArray.forEach(function(data,index){
						stateListHtml = stateListHtml + '<option value="'+data+'">'+data+'</option>';
					});
					$('#state').html(stateListHtml).closest('.form-group').removeClass('hidden');
				} else {
					$('#state').empty().closest('.form-group').addClass('hidden');
				}

				// We can't know county yet, so
				$('#county').empty().closest('.form-group').addClass('hidden');

			});

			$('#state').on('change',function(){
				state = $(this).val();

				var countyArray  = _.sortBy(_.map(_.filter(regions,{ "Country_Region": country, "Province_State" : state }),'Admin2'));
				if ( countyArray && countyArray.length > 1 ){
					var countyListHtml = '';
					countyArray.forEach(function(data,index){
						countyListHtml = countyListHtml + '<option value="'+data+'">'+data+'</option>';
					});
					$('#county').html(countyListHtml).closest('.form-group').removeClass('hidden')
				} else {
					$('#county').empty().closest('.form-group').addClass('hidden');
				}
			});

			$('#county').on('change',function(){

			});

		},
		download: true,
		header: true
	});

	// Retrieve latest data
	getRegionalData(moment());

	// Toggles between exact and estimated values
	$('.exact-toggle input').on('change',function(){
		var $w = $(this), $t = $w.prop('type'), $p = $w.closest('.exact-toggle');
		if ( $w.val() && $w.val().length > 0 ){
			$w.prop('required',true);

			$p.find('input').not(this)
				.prop({
					'required': false,
					'selected': false
				})
				.closest('label')
				.removeClass('active');

			if ( $t !== "number" ){
				$p.find('input[type="number"]').val('');
			}
		}
	});

	// Undo validation displays when values change
	$('#covidCalculator :input').on('change.validation',function(){
		if ( $('#covidCalculator').hasClass('was-validated') ){
			validateCalculator();
		}
	})

	/* Calculate */

		cutoffScore = 0.31;

		$('#covidCalculator').on('submit',function(e){
			e.preventDefault();

			var valid = validateCalculator();

			if ( !valid ) {
	      e.stopPropagation();
			}

	    // If valid
	    else {

	    		// Grab the values in the form, returns an array of objects
					var serializedAnswers  = $(this).serializeArray();

					// Turn jQ's array of objects into a single object
					var objectifiedAnswers = objectifyForm(serializedAnswers);

					// Elaborate on users's answers, calculate final score
					var answers            = finalize(objectifiedAnswers);

				/* Update UI */

					var msgMin = {
						location: 1,
						duration: 5,
						masks: .4,
						people: 2,
						publicTransport: 1,
						restrooms: 1,
						alcohol: 1
					}

					// Show answer-dependent advice
					for (const [key, value] of Object.entries(answers)) {
						if ( key === "space" && value < 5000000 || value > msgMin[key] ){
							$('#result .' + key).removeClass('hidden');
							$('#resultNudges, #result .make-it-safer').removeClass('hidden');
						}
					}

					if ( $('#result .nudge.hidden').length === $('#result .nudge').length ){
						$('#resultNudges, #result .make-it-safer').addClass('hidden');
					}

					// Yes or no?
					if ( answers.score > cutoffScore ){
						$('#result .answer').addClass('alert-danger');
						$('#result .answer .no').removeClass('hidden');
					} else {
						$('#result .answer').addClass('alert-primary');
						$('#result .answer .yes').removeClass('hidden');
					}

					// Reveal the answer
					$('#result,#result .answer').removeClass('hidden');

					// Scroll to the answer
			    $([document.documentElement, document.body]).animate({
			        scrollTop: $("#result").offset().top
			    }, 1500);

	    }

			return false;
		});

	$('[data-toggle="tooltip"]').tooltip();

	$('#theFormula').html('<pre><code>'+theAlgorithm+'</code></pre>');

	$('#cutoffScore').html(cutoffScore);

}); // document ready

function validateCalculator(){

	valid = true; // Assume the best

	// Remove prior validation
	$('#covidCalculator').removeClass('was-validated');
	$('#covidCalculator div').removeClass('wrong-number has-invalid');
	$('#result,#result .answer > span,#result .answer .nudge').addClass('hidden');
	$('#result .answer').removeClass('alert-danger alert-primary').addClass('hidden');
	$('#result .answer .no, #result .answer .yes').addClass('hidden');

  if ($('#covidCalculator')[0].checkValidity() === false) {
		valid = false;

	  // Radios
	  $('input[type="radio"]:invalid').each(function(){
			$w = $(this);
			if ( $w.closest('.btn-group-toggle').find('label.active').length === 0 ){
				$w.closest('.form-group').addClass('has-invalid');
			}
	  });

	  // Numeric Inputs
	  $('input[type="number"]:invalid').each(function(){
			$(this).closest('.form-group').addClass('has-invalid wrong-number');
	  });

	  // Shows validation indicators in the UI, if applicable
	  $('#covidCalculator').addClass('was-validated');

	  // Scroll to first error
	  var $firstError = $(":invalid").not('form').eq(0);
	  $([document.documentElement, document.body]).animate({
			scrollTop: $firstError.offset().top-260
	  }, 1000);

	}

	return valid;

}

function getRegionalData(date2){
	
	var date1    = date2.subtract(1,'day');
	var filename = 'regionalData/' + date1.format('MM-DD-YYYY') + '.csv';

	Papa.parse(filename, {
		complete: function(results) {
			regionalData = results.data;
		},
		download: true,
		header: true,
		error: function(error){
			getRegionalData(date1); // Try the day before, then
		}
	});

}

function finalize(answers){

	// "Incidence Rate" is complicated
	answers.currentIR = incidenceRate(answers);

	// Duration by unit
	answers.duration = answers.timeUnits ? parseFloat(answers.duration)*parseFloat(answers.timeUnits) : parseFloat(answers.duration);

	// If user inputted (i.e. not randomly generated) and exact, int'l locations need to use meters
	if ( answers.spaceExact && answers.spaceExact > 0 ) {
		answers.space = answers.country === "US" ? parseFloat(answers.spaceExact) : parseFloat(answers.spaceExact)*10.764;
	}

	answers.score  = theAlgorithm(answers);

	// For the easy eyeball
	console.table(answers);

	return answers;

}

function incidenceRate(answers){

	var curWeek = moment().week();

	var entry = {};

	// Gather at least country-level data
	var countryAlone = _.find(regionalData,{ "Country_Region": answers.country, "Province_State" : "", "Admin2" : "" });
	var countryAll   = _.filter(regionalData,{ "Country_Region": answers.country });

	var countryConfirmed  = countryAlone && countryAlone.Confirmed && _.isNumber(parseFloat(countryAlone.Confirmed)) ? Math.abs(parseFloat(countryAlone.Confirmed)) : regionalAggregate(countryAll,'Confirmed');
	var countryActive     = countryAlone && countryAlone.Active && _.isNumber(parseFloat(countryAlone.Active)) ? Math.abs(parseFloat(countryAlone.Active)) : regionalAggregate(countryAll,'Active');
	var countryRecovered  = countryAlone && countryAlone.Recovered && _.isNumber(parseFloat(countryAlone.Recovered)) ? Math.abs(parseFloat(countryAlone.Recovered)) : regionalAggregate(countryAll,'Recovered');
	var countryPopulation = parseFloat(_.find(regions,{ "Country_Region": answers.country, "Province_State" : "", "Admin2" : "" }).Population);
	var countryIR;

	if ( countryRecovered/countryConfirmed > .3 ){
		countryIR = countryActive/countryPopulation;
	} else {
		countryIR = (countryConfirmed/curWeek)/countryPopulation;
	}

	entry.country = countryIR;

	// But also state, if we have it
	if ( answers.state ){ 

		var stateAlone = _.find(regionalData,{ "Country_Region": answers.country, "Province_State" : answers.state, "Admin2" : "" });
		var stateAll   = _.filter(regionalData,{ "Country_Region": answers.country, "Province_State" : answers.state });

		var stateConfirmed  = stateAlone && stateAlone.Confirmed && _.isNumber(parseFloat(stateAlone.Confirmed)) ? Math.abs(parseFloat(stateAlone.Confirmed)) : regionalAggregate(stateAll,'Confirmed');
		var stateActive     = stateAlone && stateAlone.Active && _.isNumber(parseFloat(stateAlone.Active)) ? Math.abs(parseFloat(stateAlone.Active)) : regionalAggregate(stateAll,'Active');
		var stateRecovered  = stateAlone && stateAlone.Recovered && _.isNumber(parseFloat(stateAlone.Recovered)) ? Math.abs(parseFloat(stateAlone.Recovered)) : regionalAggregate(stateAll,'Recovered');
		var statePopulation = parseFloat(_.find(regions,{ "Country_Region": answers.country, "Province_State" : answers.state, "Admin2" : "" }).Population);
		var stateIR;

		if ( stateRecovered/stateConfirmed > .3 ){
			stateIR = stateActive/statePopulation;
		} else {
			stateIR = (stateConfirmed/curWeek)/statePopulation;
		}

		entry.state = stateIR;

	}

	// County-level is ideal
	if ( answers.county ){ 
		var countyAlone      = _.find(regionalData,{ "Country_Region": answers.country, "Province_State" : answers.state, "Admin2" : answers.county });
		if ( countyAlone ){
			var countyConfirmed  = Math.abs(parseFloat(countyAlone.Confirmed));
			var countyActive     = Math.abs(parseFloat(countyAlone.Active));
			var countyRecovered  = Math.abs(parseFloat(countyAlone.Recovered));
			var countyPopulation = parseFloat(_.find(regions,{ "Country_Region": answers.country, "Province_State" : answers.state, "Admin2" : answers.county }).Population);
			
			if ( countyAlone && countyPopulation ){
				var countyIR;

				if ( parseFloat(countyRecovered)/parseFloat(countyConfirmed) > .3 ){
					countyIR = parseFloat(countyActive)/countyPopulation;
				} else {
					countyIR = (parseFloat(countyConfirmed)/curWeek)/countyPopulation;
				}

				entry.county = countyIR;
			}
		}
	}

	// Then prioritize by specificity, with country as the default since it is a required field in the UI
	if ( entry.county ){
		return entry.county;
	} else if ( entry.state ){
		return entry.state;
	} else {
		return entry.country;
	}
}

function regionalAggregate(all,key){
	var entries = _.reject(all,[key,'']);
	_.forEach(entries,function(o){
		o[key] = Math.abs(parseFloat(o[key]));
	});

	return _.sumBy(entries,key);
}

function tip(id){
	$('#stripeError').addClass('hidden');
	var stripe = Stripe('pk_live_TSrb3B6aJLHDffTFBDh5JD3a');
	stripe
	.redirectToCheckout({
    lineItems: [{price: id, quantity: 1}],
    mode: 'payment',
	  successUrl: 'https://covidcalculator.xyz/thanks',
	  cancelUrl: 'https://covidcalculator.xyz/cancel'
	})
	.then(function (result) {
    if (result.error) {
      $('#stripeError').removeClass('hidden');
    }
  });

}

function objectifyForm(formArray) {

  var returnArray = {};
  
  for (var i = 0; i < formArray.length; i++){
  	var key = formArray[i]['name'];
    returnArray[key] = formArray[i]['value'] && formArray[i]['value'].length > 0 ? parseFloat(formArray[i]['value']) : null; // All numbers, please
    if ( isNaN(returnArray[key]) ) { returnArray[key] = formArray[i]['value'] } // Well, mostly numbers
  }
  
  return returnArray;

}

function theAlgorithm(answers){
 answers.regionalRisk = 1 + (answers.currentIR*1000);
 answers.distance     = Math.sqrt(answers.space/answers.people);
 answers.distancing   = answers.location > 1 ? 100/Math.pow(answers.distance,2) : (20/Math.pow(answers.distance,2))+.5; // Indoors? 10 ft.       Outdoors? 6 ft.
 answers.exposure     = answers.location > 1 ? (0.0001*Math.pow(answers.duration,2))+1 : 0.004*answers.duration + 1.04; // Indoors? Exponential. Outdoors? Linear.
 return answers.regionalRisk * answers.location * answers.masks * answers.exposure * answers.distancing * answers.publicTransport * answers.restrooms * answers.alcohol;
}

var metrics = [
	{
		name: "location",
		options: [
			{ label: "Indoors",	  value: 1.87	},
			{ label: "Outdoors",	value: .1	}
		]
	},
	{
		name: "space",
		options: [
			{ label: "250 sqft",     value: 250	},
			{ label: "750 sqft",     value: 750	},
			{ label: "2,000 sqft",   value: 2000	},
			{ label: "5,000 sqft",	 value: 5000	},
			{ label: "15,000 sqft",	 value: 15000	},
			{ label: "50,000 sqft",	 value: 50000	},
			{ label: "500,000 sqft", value: 500000	}
		]
	},
	{
		name: "people",
		options: [
			{ label: "2",	  value: 2	},
			{ label: "3",	  value: 3	},
			{ label: "4",	  value: 4	},
			{ label: "5",	  value: 5	},
			{ label: "10",	value: 10	},
			{ label: "30",	value: 30	},
			{ label: "75",	value: 75	},
			{ label: "500",	value: 500	}
		]
	},
	{
		name: "masks",
		options: [
			{ label: "None", value: 1.0	},
			{ label: "Some", value: 0.9	},
			{ label: "Most", value: 0.6	},
			{ label: "All",	 value: 0.4	}
		]
	},
	{
		name: "duration",
		options: [
			{ label: "15 minutes",	value: 15	},
			{ label: "1 hour",			value: 60	},
			{ label: "2 hours",			value: 120	},
			{ label: "3 hours",			value: 180	},
			{ label: "4 hours",			value: 240	},
			{ label: "5 hours",			value: 300	},
			{ label: "8 hours",			value: 480	}
		]
	},
	{
		name: "publicTransport",
		options: [
			{ label: "Yes",	value: 1.2	},
			{ label: "No",	value: 1.0	}
		]
	},
	{
		name: "restrooms",
		options: [
			{ label: "Yes",	value: 1.1	},
			{ label: "No",	value: 1	}
		]
	},
	{
		name: "alcohol",
		options: [
			{ label: "Yes",	value: 1.3	},
			{ label: "No",	value: 1	}
		],
	}
];

var scenarios = [];

function nScenarios(n){

	for (i = 0; i < n; i++) {
	  randomScenario();
	}

	var uniqueScenarios = _.uniqBy(scenarios,'description');

	var sortedScenarios = _.orderBy(uniqueScenarios, ['score'], ['desc']);

  var csv = Papa.unparse(sortedScenarios);

  downloadFile(csv,'cc-scenarios','csv');

}

function randomScenario(){

	var scenario = {};

	// Random Location
	var randnum = getRandomInt(0,regions.length-1);
	var randloc = regions[randnum];
	scenario.country = randloc.Country_Region;
	if ( randloc.Province_State !== "" ){ scenario.state = randloc.Province_State; }
	if ( randloc.Admin2 !== "" ){ scenario.county = randloc.Admin2; }
	scenario.description = "Location: " + randloc.Combined_Key + "; ";

	// Random Attributes
	metrics.forEach(function(data,index){

		// Pick a random answer
		var which = getRandomInt(0,data.options.length-1);
		scenario[data.name] = data.options[which].value;

		// Add a description for easy eyeball
		var metricText = data.name + ": " + data.options[which].label + "; ";
		scenario.description = scenario.description + metricText;

	});

	scenario = finalize(scenario);

	scenarios.push(scenario);

}

function getRandomInt(min, max) {
  min = Math.ceil(min);
  max = Math.floor(max);
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function downloadFile(data,filename,type){
  
  var fileType = type === 'txt' ? 'plain' : type;
  
  var fileData = new Blob([data], {"type": 'text/'+fileType+';charset=utf-8;'});

  //IE11 & Edge
  if (navigator.msSaveBlob) {
      navigator.msSaveBlob(fileData, exportFilename);
  }

  // Everybody else
  else {

    var csvLink = document.createElement('a');
        csvLink.href = window.URL.createObjectURL(fileData);
        csvLink.setAttribute('download', filename+'.'+type);

    // Attach
    document.body.appendChild(csvLink);

    // Click
    csvLink.click();

    // Remove
    document.body.removeChild(csvLink);

  }
} // downloadFile

// end cc.js
