$(document).ready(function(){

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

			if ( totalScore > 28 ){
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
    returnArray[key] = parseInt(formArray[i]['value']);
  }
  
  return returnArray;

}

function theAlgorithm(results){
	var publicTransport = results.publicTransport ? results.publicTransport : 0;
	var restrooms = results.restrooms ? results.restrooms : 0;
	var alcohol = results.alcohol ? results.alcohol : 0;
	return ( results.space + results.people + results.duration + publicTransport + restrooms + alcohol ) * results.riskLevel * results.masks * results.location;
}

function allOutcomes(){
	// TODO
}