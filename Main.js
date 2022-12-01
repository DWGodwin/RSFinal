
//Usethis
// This example demonstrates the use of the Landsat 8 Collection 2, Level 2
// QA_PIXEL band (CFMask) to mask unwanted pixels.

function maskL7sr(image) {
  // Bit 0 - Fill
  // Bit 1 - Dilated Cloud
  // Bit 2 - Cirrus
  // Bit 3 - Cloud
  // Bit 4 - Cloud Shadow
  var qaMask = image.select('QA_PIXEL').bitwiseAnd(parseInt('11111', 2)).eq(0);
  var saturationMask = image.select('QA_RADSAT').eq(0);

  // Apply the scaling factors to the appropriate bands.
  var opticalBands = image.select('SR_B.*').multiply(0.0000275).add(-0.2);
  var thermalBands = image.select('ST_B.*').multiply(0.00341802).add(149.0);

  // Replace the original bands with the scaled ones and apply the masks.
  return image.addBands(opticalBands, null, true)
      .addBands(thermalBands, null, true)
      .updateMask(qaMask)
      .updateMask(saturationMask);
}
// Set a region for data collection, in this case California
var region = ee.Geometry.Polygon(
  [[[-126.36996732702173, 42.88647401853699],
    [-126.36996732702173, 32.0388653264998],
    [-112.57113920202173, 32.0388653264998],
    [-112.57113920202173, 42.88647401853699]]], null, false
    );


var year = 2017

// Map the function over one year of data.
var collection = ee.ImageCollection('LANDSAT/LE07/C02/T2_L2')
                     .filterDate(year+'-05-28', year+'-09-01')
                     .filterBounds(region)
                     .map(maskL7sr);

var addNDVIandNDWI = function(image) {
  var ndvi = image.normalizedDifference(['SR_B5', 'SR_B4']).rename('NDVI');
  var ndwi = image.normalizedDifference(['SR_B2', 'SR_B4']).rename('NDWI');
  return image.addBands(ndvi).addBands(ndwi);
};
var collection = collection.map(addNDVIandNDWI)

print ('collection', collection)
//creates a median of the entire collection for display
//var composite = collection.median();

//This block takes the images from collection, which are already cloudmasked,
//And averages them by month and year to create average images
//for each month
//var months = ee.List.sequence(6, 9);
//var years = ee.List.sequence(2010, 2010);

//var byMonthYear = ee.ImageCollection.fromImages(
//  years.map(function(y) {
//    return months.map(function (m) {
//      return collection
//        .filter(ee.Filter.calendarRange(y, y, 'year'))
//        .filter(ee.Filter.calendarRange(m, m, 'month'))
//        .mean()
//        .set('month', m).set('year', y);
//  });
//}).flatten());
//print('byMonthYear',byMonthYear)



var compositeBMY = collection.median();

print('compositeBMY',compositeBMY)



// 11/14: now what we have to do is average June, July, and August
//In order to create a dataset that is summer averages

//Then, we will take Bands 2 and 4 from these to create NDWI


// Display the results.
Map.setCenter(-123.19, 40.95, 9);  // Location of fires
//Map.addLayer(compositeBMY, {bands: ['SR_B4', 'SR_B3', 'SR_B2'], min: 0, max: 0.3});
Map.addLayer(compositeBMY, {bands: ['NDVI'], min: -1, max: 1});
