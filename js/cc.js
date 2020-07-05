$(document).ready(function(){

	var cutoffScore = 35;

	$('#covidCalculator').on('submit',function(e){
		e.preventDefault();

		var $form = $(this);

		$('#no,#yes,#result').addClass('hidden');

    if ($form[0].checkValidity() === false) {
      event.preventDefault();
      event.stopPropagation();
    } else {

			var results    = $(this).serializeArray();
					results    = objectifyForm(results);

			var totalScore = theAlgorithm(results);
			console.log(totalScore);

			if ( totalScore > cutoffScore ){
				$('#no').removeClass('hidden');
			} else {
				$('#yes').removeClass('hidden');
			}
			$('#result').removeClass('hidden');

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

function theAlgorithm(results){
	var publicTransport = results.publicTransport ? results.publicTransport : 0;
	var restrooms = results.restrooms ? results.restrooms : 0;
	var alcohol = results.alcohol ? results.alcohol : 0;
	return ( results.space + results.people + results.duration + publicTransport + restrooms + alcohol ) * results.riskLevel * results.masks * results.location;
}

var metrics = [
	{
		name: "riskLevel",
		type: "multiply",
		layout: "custom",
		inputType: "radio",
		options: [
			{
				label: "Low",
				value: 1
			},
			{
				label: "Medium",
				value: 2
			},
			{
				label: "High",
				value: 3
			},
			{
				label: "Critical",
				value: 4
			}
		],
		question: "Choose the risk level you found:"
	},
	{
		name: "location",
		type: "multiply",
		layout: "btn-group",
		inputType: "radio",
		options: [
			{
				label: "Indoors",
				value: 2
			},
			{
				label: "Outdoors",
				value: 1
			}
		],
		question: "Is it indoors or outdoors?"
	},
	{
		name: "space",
		type: "add",
		layout: "btn-group-vertical",
		inputType: "radio",
		options: [
			{
				label: "Small",
				help: " - living room or patio",
				value: 5
			},
			{
				label: "Medium",
				help: " - restaurant or backyard",
				value: 3
			},
			{
				label: "Large",
				help: " - movie theater or park",
				value: 2
			},
			{
				label: "Extra Large",
				help: " - stadium or arena",
				value: 1
			}
		],
		question: "How big is the space?"
	},
	{
		name: "people",
		type: "add",
		layout: "btn-group",
		inputType: "radio",
		options: [
			{
				label: "2",
				value: 1
			},
			{
				label: "3-10",
				value: 2
			},
			{
				label: "11-49",
				value: 3
			},
			{
				label: "50+",
				value: 4
			}
		],
		question: "How many people do you expect to be there? (including you)"
	},
	{
		name: "masks",
		type: "multiply",
		layout: "btn-group",
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
		],
		question: "How many people do you expect to wear a mask?"
	},
	{
		name: "duration",
		type: "add",
		layout: "btn-group",
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
		],
		question: "How long will you stay? (in hours)"
	},
	{
		name: "publicTransport",
		type: "add",
		layout: "btn-group",
		inputType: "checkbox",
		options: [
			{
				label: "You must take public transportation.",
				value: 3
			}
		]
	},
	{
		name: "restrooms",
		type: "add",
		layout: "btn-group",
		inputType: "checkbox",
		options: [
			{
				label: "You will be using public or shared restrooms.",
				value: 2
			}
		]
	},
	{
		name: "alcohol",
		type: "add",
		layout: "btn-group",
		inputType: "checkbox",
		options: [
			{
				label: "Attendees will be drinking alcohol.",
				value: 2
			}
		],
	}
];

// end cc.js
