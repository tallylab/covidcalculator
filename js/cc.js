var regionalData;

$(document).ready(function(){

	//regionalData = example.regions;
	$.getJSON('https://cov19.cc/report.json?',function(data){	regionalData = data.regions; });

	/* Form data and interactivity */

		var regionArray = _.sortBy(_.uniq(_.map(regions.world.list,'country'))), regionListHtml = '<option></option>';

		regionArray.forEach(function(data,index){
			regionListHtml = regionListHtml + '<option value="'+data+'">'+data+'</option>';
		});

		$('#countries').html(regionListHtml);

		$('#countries').on('change',function(){
			var country = $(this).val().toLowerCase().replace(/ /g,'');
			if ( regions[country] ){
				var stateArray = _.sortBy(_.uniq(_.map(regions[country].list,'state'))), stateListHtml = '<option></option>';
				stateArray.forEach(function(data,index){
					stateListHtml = stateListHtml + '<option value="'+data+'">'+data+'</option>';
				});
				$('#state').prop('required',true).html(stateListHtml).closest('.form-group').removeClass('hidden')
			} else {
				$('#state').removeProp('required').empty().closest('.form-group').addClass('hidden');
			}
		});

		$('.exact-toggle input[type="number"]').on('change',function(){
			var $parent = $(this).closest('.exact-toggle');
			if ( $(this).val() && $(this).val() > 0 ){
				$parent.find('input[type="radio"]').prop({
					'required': false,
					'selected': false
				})
				.closest('label').removeClass('active');
			} else {
				$parent.find('input[type="radio"]').prop('required',true);
			}
		});

	/* Calculate */

		var cutoffScore = 1180;

		$('#covidCalculator').on('submit',function(e){
			e.preventDefault();

			var $form = $(this);

			// Remove prior validation
			$('#result,#result .answer > span,#result .answer .nudge').addClass('hidden');
			$('#result .answer').removeClass('alert-danger alert-primary').addClass('hidden')

			// If invalid, show errors and stop processing
	    if ($form[0].checkValidity() === false) {
	      event.preventDefault();
	      event.stopPropagation();
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

					// Show answer-dependent advice
					for (const [key, value] of Object.entries(answers)) {
						if ( value && value > 0 || ( key === "alcohol" && value > 1 ) ){
							$('#result .' + key).removeClass('hidden');
						}
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
	    
	    // Shows validation indicators in the UI, if applicable
	    $form.addClass('was-validated');

			return false;
		});

	$('[data-toggle="tooltip"]').tooltip();

}); // document ready

function finalize(answers){

	// Regional Risk defaults to country level
	var country = answers.country.toLowerCase().replace(/ /g,'');
	var countryData = _.find(regionalData.world.list,{'country': answers.country });

	// If there is no Incidence Rate for a country, create a mean Incidence Rate from all countries that do have an Incidence Rate specified
	answers.incidenceRate = countryData['Incidence_Rate'] ? parseFloat(countryData['Incidence_Rate']) : _.mean(_.map(regionalData.world.list,function(o){ if ( o.Incidence_Rate ) return parseFloat(o.Incidence_Rate); }));

	// If there is state data, use it
	if ( answers.state ){
		var stateData = _.find(regionalData[country].list,{'state': answers.state });
		answers.incidenceRate = stateData['Incidence_Rate'] ? parseFloat(stateData['Incidence_Rate']) : answers.incidenceRate; // Falls back to country
	} 

	// Values with the option to input an exact value
	if ( answers.spaceExact && answers.spaceExact.length > 0 )    { answers.space = answers.spaceExact }
	if ( answers.peopleExact && answers.peopleExact.length > 0 )   { answers.people = answers.peopleExact }
	if ( answers.durationExact && answers.durationExact.length > 0 ) { answers.duration = answers.durationExact }

	if ( answers.publicTransport === 1 ) {
		answers.publicTransport = theAlgorithm({

			// Our assumptions about PT...
			location: 1.87,      // Indoors
			space: 300,          // Average square feet of a city bus or train car according to https://www.codot.gov/programs/commuterchoices/documents/trandir_transit.pdf)
			masks: 0.9,          // Most are wearing masks
			duration: 60,        // Length of trip is an optimistic 30 minutes each way, considering the average commute is 45 minutes one-way, according to https://www.governing.com/gov-data/transportation-infrastructure/commute-time-averages-drive-public-transportation-bus-rail-by-metro-area.html
			people: 25,			     // Roughly 25-33% capcity, according to [citation needed]
			publicTransport: 0,  // This is public transportation already, so don't add more
			restrooms: 0,				 // Assume no bathroom stops as part of transit
			alcohol: 1,					 // Assume this is not a party ride
			
			// Context-dependent variables
			incidenceRate: answers.incidenceRate

		});
	}
	
	if ( answers.restrooms === 1 ) { 
		answers.restrooms = theAlgorithm({
			
			// Our assumptions about restrooms...
			location: 1.87,			// Indoors
			space: 200,					// Average square feet of public restroom [citation needed]
			duration: 5,				// Average length of bathroom visit [citation needed]
			people: 2,					// Average occupancy of public restroom at any given moment [citation needed]
			publicTransport: 0, // Assume we don't have to take additional transit in order to arrive at bathroom
			restrooms: 0,				// This is bathroom already, so don't add more
			alcohol: 1,					// Assume this is not a party bathroom

			// Context-dependent variables
			incidenceRate: answers.incidenceRate,
			masks: answers.masks

		});
	}

	answers.score  = theAlgorithm(answers);

	// For the easy eyeball
	console.table(answers);

	return answers;

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
	answers.distancing = Math.sqrt(answers.space/answers.people);
	return ( ( answers.incidenceRate * answers.location * answers.masks * answers.duration * answers.alcohol ) / answers.distancing ) + answers.publicTransport + answers.restrooms;
}

var metrics = [
	{
		name: "country",
		options: [
			{
				label: "United States",
				value: "United States"
			}
		]
	},
	{
		name: "state",
		options: [
      {
        label: "South Carolina",
        value: "South Carolina"
      },
      {
        label: "Louisiana",
        value: "Louisiana"
      },
      {
        label: "Virginia",
        value: "Virginia"
      },
      {
        label: "Idaho",
        value: "Idaho"
      },
      {
        label: "Iowa",
        value: "Iowa"
      },
      {
        label: "Kentucky",
        value: "Kentucky"
      },
      {
        label: "Missouri",
        value: "Missouri"
      },
      {
        label: "Oklahoma",
        value: "Oklahoma"
      },
      {
        label: "Colorado",
        value: "Colorado"
      },
      {
        label: "Illinois",
        value: "Illinois"
      },
      {
        label: "Indiana",
        value: "Indiana"
      },
      {
        label: "Mississippi",
        value: "Mississippi"
      },
      {
        label: "Nebraska",
        value: "Nebraska"
      },
      {
        label: "North Dakota",
        value: "North Dakota"
      },
      {
        label: "Ohio",
        value: "Ohio"
      },
      {
        label: "Pennsylvania",
        value: "Pennsylvania"
      },
      {
        label: "Washington",
        value: "Washington"
      },
      {
        label: "Wisconsin",
        value: "Wisconsin"
      },
      {
        label: "Vermont",
        value: "Vermont"
      },
      {
        label: "Puerto Rico",
        value: "Puerto Rico"
      },
      {
        label: "Minnesota",
        value: "Minnesota"
      },
      {
        label: "Florida",
        value: "Florida"
      },
      {
        label: "North Carolina",
        value: "North Carolina"
      },
      {
        label: "California",
        value: "California"
      },
      {
        label: "New York",
        value: "New York"
      },
      {
        label: "Wyoming",
        value: "Wyoming"
      },
      {
        label: "Michigan",
        value: "Michigan"
      },
      {
        label: "Alaska",
        value: "Alaska"
      },
      {
        label: "Maryland",
        value: "Maryland"
      },
      {
        label: "Kansas",
        value: "Kansas"
      },
      {
        label: "Tennessee",
        value: "Tennessee"
      },
      {
        label: "Texas",
        value: "Texas"
      },
      {
        label: "Maine",
        value: "Maine"
      },
      {
        label: "Arizona",
        value: "Arizona"
      },
      {
        label: "Georgia",
        value: "Georgia"
      },
      {
        label: "Arkansas",
        value: "Arkansas"
      },
      {
        label: "New Jersey",
        value: "New Jersey"
      },
      {
        label: "South Dakota",
        value: "South Dakota"
      },
      {
        label: "Alabama",
        value: "Alabama"
      },
      {
        label: "Oregon",
        value: "Oregon"
      },
      {
        label: "West Virginia",
        value: "West Virginia"
      },
      {
        label: "Massachusetts",
        value: "Massachusetts"
      },
      {
        label: "Utah",
        value: "Utah"
      },
      {
        label: "Montana",
        value: "Montana"
      },
      {
        label: "New Hampshire",
        value: "New Hampshire"
      },
      {
        label: "New Mexico",
        value: "New Mexico"
      },
      {
        label: "Rhode Island",
        value: "Rhode Island"
      },
      {
        label: "Nevada",
        value: "Nevada"
      },
      {
        label: "District of Columbia",
        value: "District of Columbia"
      },
      {
        label: "Connecticut",
        value: "Connecticut"
      },
      {
        label: "Hawaii",
        value: "Hawaii"
      },
      {
        label: "Delaware",
        value: "Delaware"
      },
      {
        label: "Guam",
        value: "Guam"
      },
      {
        label: "Northern Mariana Islands",
        value: "Northern Mariana Islands"
      },
      {
        label: "Virgin Islands",
        value: "Virgin Islands"
      },
      {
        label: "United States Virgin Islands",
        value: "United States Virgin Islands"
      },
      {

        label: "Veteran Affairs",
        value: "Veteran Affairs"
      },
      {
        label: "U.S. Military",
        value: "U.S. Military"
      },
      {
        label: "Federal Prisons",
        value: "Federal Prisons"
      },
      {
        label: "Navajo Nation",
        value: "Navajo Nation"
      }
    ]
	},
	{
		name: "location",
		options: [
			{
				label: "Indoors",
				value: 1.87
			},
			{
				label: "Outdoors",
				value: .1
			}
		]
	},
	{
		name: "space",
		options: [
			{
				label: "Small",
				value: 250
			},
			{
				label: "Medium",
				value: 5000
			},
			{
				label: "Large",
				value: 50000
			},
			{
				label: "Extra Large",
				value: 500000
			}
		]
	},
	{
		name: "people",
		options: [
			{
				label: "2",
				value: 2
			},
			{
				label: "3-10",
				value: 10
			},
			{
				label: "11-99",
				value: 100
			},
			{
				label: "100+",
				value: 1000
			}
		]
	},
	{
		name: "masks",
		options: [
			{
				label: "None",
				value: 1
			},
			{
				label: "Some",
				value: .9
			},
			{
				label: "Most",
				value: .6
			},
			{
				label: "All",
				value: .4
			}
		]
	},
	{
		name: "duration",
		options: [
			{
				label: "< 1",
				value: 60
			},
			{
				label: "1-2",
				value: 120
			},
			{
				label: "3-4",
				value: 240
			},
			{
				label: "5+",
				value: 360
			}
		]
	},
	{
		name: "publicTransport",
		options: [
			{
				label: "Yes",
				value: 1
			},
			{
				label: "No",
				value: 0
			}
		]
	},
	{
		name: "restrooms",
		options: [
			{
				label: "Yes",
				value: 1
			},
			{
				label: "No",
				value: 0
			}
		]
	},
	{
		name: "alcohol",
		options: [
			{
				label: "Yes",
				value: 1.25
			},
			{
				label: "No",
				value: 1
			}
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

	metrics.forEach(function(data,index){

		// Pick a random answer
		var which = getRandomInt(0,data.options.length-1);
		scenario[data.name] = data.options[which].value;

		// Add a description for easy eyeball
		var metricText = data.name + ": " + data.options[which].label + "; ";
		scenario.description = scenario.description ? scenario.description + metricText : metricText;

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
