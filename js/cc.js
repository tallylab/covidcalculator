$(document).ready(function(){

	var cutoffScore = 35;

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
	})

	$('#covidCalculator').on('submit',function(e){
		e.preventDefault();

		var $form = $(this);

		$('#result,#result .answer > span,#result .answer .nudge').addClass('hidden');
		$('#result .answer').removeClass('alert-danger alert-primary').addClass('hidden')

    if ($form[0].checkValidity() === false) {
      event.preventDefault();
      event.stopPropagation();
    } else {

			var answers    = $(this).serializeArray();
					answers    = objectifyForm(answers);

			var totalScore = theAlgorithm(answers);

			answers.score  = totalScore;
			
			console.table(answers);

			if ( results.location > 1){	$('#result .location').removeClass('hidden'); }
			if ( results.space 		> 1){	$('#result .space').removeClass('hidden'); }
			if ( results.people 	> 1){	$('#result .people').removeClass('hidden'); }
			if ( results.masks 		> 1){	$('#result .masks').removeClass('hidden'); }
			if ( results.duration 		> 1){	$('#result .duration').removeClass('hidden'); }

			if ( totalScore > cutoffScore ){
				$('#result .answer').addClass('alert-danger');
				$('#result .answer .no').removeClass('hidden');
			} else {
				$('#result .answer').addClass('alert-primary');
				$('#result .answer .yes').removeClass('hidden');
			}
			$('#result,#result .answer').removeClass('hidden');

	    $([document.documentElement, document.body]).animate({
	        scrollTop: $("#result").offset().top
	    }, 1500);

    }
    
    $form.addClass('was-validated');

		return false;
	});

	$('[data-toggle="tooltip"]').tooltip();

}); // document ready

function objectifyForm(formArray) {

  var returnArray = {};
  
  for (var i = 0; i < formArray.length; i++){
  	var key = formArray[i]['name'];
    returnArray[key] = parseFloat(formArray[i]['value']); // All numbers, please
  }
  
  return returnArray;

}

function theAlgorithm(answers){
	var publicTransport = answers.publicTransport ? answers.publicTransport : 0;
	var restrooms = answers.restrooms ? answers.restrooms : 0;
	var alcohol = answers.alcohol ? answers.alcohol : 0;
	var sqFtPerPerson = answers.peopleExact && answers.peopleExact > 1 ? answers.space/answers.peopleExact : answers.space/answers.people;
	var distancing = Math.sqrt(sqFtPerPerson);
	return ( ( answers.duration + publicTransport + restrooms + alcohol ) * answers.riskLevel * answers.masks * answers.location ) / distancing;
}

var metrics = [
	{
		name: "riskLevel",
		inputType: "radio",
		options: [
			{
				label: "Low",
				value: 0.9
			},
			{
				label: "Medium",
				value: 1.2
			},
			{
				label: "High",
				value: 1.5
			},
			{
				label: "Critical",
				value: 2
			}
		]
	},
	{
		name: "location",
		inputType: "radio",
		options: [
			{
				label: "Indoors",
				value: 2
			},
			{
				label: "Outdoors",
				value: .1
			}
		]
	},
	{
		name: "space",
		inputType: "radio",
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
		inputType: "radio",
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
		inputType: "radio",
		options: [
			{
				label: "None",
				value: 4
			},
			{
				label: "Some",
				value: 3
			},
			{
				label: "Most",
				value: 2
			},
			{
				label: "All",
				value: 1
			}
		]
	},
	{
		name: "duration",
		inputType: "radio",
		options: [
			{
				label: "< 1",
				value: 1
			},
			{
				label: "1-2",
				value: 2
			},
			{
				label: "3-6",
				value: 3
			},
			{
				label: "7+",
				value: 4
			}
		]
	},
	{
		name: "publicTransport",
		inputType: "checkbox",
		options: [
			{
				label: "Yes",
				value: 3
			},
			{
				label: "No",
				value: 0
			}
		]
	},
	{
		name: "restrooms",
		inputType: "checkbox",
		options: [
			{
				label: "Yes",
				value: 2
			},
			{
				label: "No",
				value: 0
			}
		]
	},
	{
		name: "alcohol",
		inputType: "checkbox",
		options: [
			{
				label: "Yes",
				value: 1
			},
			{
				label: "No",
				value: 0
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
		var which = getRandomInt(0,data.options.length-1);
		scenario[data.name] = data.options[which].value;
		var metricText = data.name + ": " + data.options[which].label + "; ";
		scenario.description = scenario.description ? scenario.description + metricText : metricText;
	});

	var totalScore = theAlgorithm(scenario);

	scenario.score  = totalScore;

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
