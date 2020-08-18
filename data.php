<?php

// COVID-19 Data Repository by the Center for Systems Science and Engineering (CSSE) at Johns Hopkins University
// https://github.com/CSSEGISandData/COVID-19

// Yesterday
$yesterday = strtotime("Yesterday");
$yesterdayFormatted = date("m-d-Y", $yesterday);
$url1 = 'https://raw.githubusercontent.com/CSSEGISandData/COVID-19/master/csse_covid_19_data/csse_covid_19_daily_reports/' . $yesterdayFormatted . '.csv';

// Day Before Yesterday
$daybefore = strtotime("-1 day", $yesterday);
$daybeforeFormatted = date("m-d-Y", $daybefore);
$url2 = 'https://raw.githubusercontent.com/CSSEGISandData/COVID-19/master/csse_covid_19_data/csse_covid_19_daily_reports/' . $daybeforeFormatted . '.csv';

// Try to collect yesterday's file
$csv = file_get_contents($url1);
$newfile = 'regionalData/' . $yesterdayFormatted . '.csv';

// If it isn't there, try the day before 
if ( $csv === FALSE ) {
	$csv = file_get_contents($url2);
	$newfile = 'regionalData/' . $daybeforeFormatted . '.csv';
}

// Save it
file_put_contents($newfile, $csv);

?>