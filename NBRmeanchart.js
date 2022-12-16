var fires = ee.FeatureCollection("projects/ee-dgodwin-rsfinal/assets/Rivercomplex");

//Use this to create the main collection.
//Each element of the collection represents the surface reflectance bands and NBR between May 28 and August 28 of the years 1997-2017
//There is no data for 2012, as it represents a gap in coverage between Landsat 5 and 8, during which Landsat 7 produced poor quality data

// Declare years and dates of interest, this can be changed at will without changing any other code
var L5startYear = 2000;
var L5endYear = 2011; //Always skip 2012, as there is no data
var L8startYear = 2013; //Always skip 2012, as there is no data
var L8endYear = 2021;
var startMonth = 6;
var startDay = 1;
var endMonth = 7;
var endDay = 30;

var L5startDate = ee.Date.fromYMD(L5startYear, startMonth, startDay);
var L5endDate = ee.Date.fromYMD(L5endYear, endMonth, endDay);
var L8startDate = ee.Date.fromYMD(L8startYear, startMonth, startDay);
var L8endDate = ee.Date.fromYMD(L8endYear, endMonth, endDay);

//Set the region for data collection as overlapping the study area shapefiles
var region = ee.FeatureCollection(fires).geometry()


//First, we create the cloud masking function

// This example demonstrates the use of the Landsat 4, 5, 7 Collection 2,
// Level 2 QA_PIXEL band (CFMask) to mask unwanted pixels.

function maskL457sr(image) {
  // Bit 0 - Fill
  // Bit 1 - Dilated Cloud
  // Bit 2 - Unused
  // Bit 3 - Cloud
  // Bit 4 - Cloud Shadow
  var qaMask = image.select('QA_PIXEL').bitwiseAnd(parseInt('11111', 2)).eq(0);
  var saturationMask = image.select('QA_RADSAT').eq(0);

  // Apply the scaling factors to the appropriate bands.
  var opticalBands = image.select('SR_B.').multiply(0.0000275).add(-0.2);
  var thermalBand = image.select('ST_B6').multiply(0.00341802).add(149.0);

  // Replace the original bands with the scaled ones and apply the masks.
  return image.addBands(opticalBands, null, true)
      .addBands(thermalBand, null, true)
      .updateMask(qaMask)
      .updateMask(saturationMask);
}

// Get all data in the desired range and apply the mask
var collection = ee.ImageCollection('LANDSAT/LT05/C02/T1_L2')
                    .filterDate(L5startDate, L5endDate)
                    .filterBounds(region)
                    .map(maskL457sr);


//Define the function to add NBR
var addNBR = function(image) {
  var nbr = image.normalizedDifference(['SR_B4', 'SR_B7']).rename('NBR');
  return image.addBands(nbr);
};


//Add the NBR
var collection = collection.map(addNBR)

var L5years = ee.List.sequence(L5startYear, L5endYear);
// Map a function to select data within the year and apply median reducer
var L5summermedian = ee.ImageCollection.fromImages(
    L5years.map(function(year) {
      var startDate = ee.Date.fromYMD(year, startMonth, startDay);
      var endDate = ee.Date.fromYMD(year, endMonth, endDay);
      var annual = collection
        .filterDate(startDate, endDate)
        .median();
      return annual
        .set('year', year)
        .set('system:time_start', ee.Date.fromYMD(year, 1, 1).format("YYYY_MM_dd"))
    })
  );

function maskL8sr(image) {
  // Bit 0 - Fill
  // Bit 1 - Dilated Cloud
  // Bit 2 - Cirrus
  // Bit 3 - Cloud
  // Bit 4 - Cloud Shadow
  var qaMask = image.select('QA_PIXEL').bitwiseAnd(parseInt('11111', 2)).eq(0);
  var saturationMask = image.select('QA_RADSAT').eq(0);

  // Apply the scaling factors to the appropriate bands.
  var opticalBands = image.select('SR_B.').multiply(0.0000275).add(-0.2);
  var thermalBands = image.select('ST_B.*').multiply(0.00341802).add(149.0);

  // Replace the original bands with the scaled ones and apply the masks.
  return image.addBands(opticalBands, null, true)
      .addBands(thermalBands, null, true)
      .updateMask(qaMask)
      .updateMask(saturationMask);
}

// Map the function over one year of data.
var collection = ee.ImageCollection('LANDSAT/LC08/C02/T1_L2')
                    .filterDate(L8startDate, L8endDate)
                    .filterBounds(region)
                    .map(maskL8sr);

//Define the function to add NBR
var addNBR = function(image) {
  var nbr = image.normalizedDifference(['SR_B5', 'SR_B7']).rename('NBR');
  return image.addBands(nbr);
};

//Add the NBR
var collection = collection.map(addNBR)

var L8years = ee.List.sequence(L8startYear, L8endYear);
// Map a function to select data within the year and apply median reducer
var L8summermedian = ee.ImageCollection.fromImages(
    L8years.map(function(year) {
      var startDate = ee.Date.fromYMD(year, startMonth, startDay);
      var endDate = ee.Date.fromYMD(year, endMonth, endDay);
      var annual = collection
        .filterDate(startDate, endDate)
        .median();
      return annual
        .set('year', year)
        .set('system:time_start', ee.Date.fromYMD(year, 1, 1).format("YYYY_MM_dd"))
    })
  );

var maincollection = L5summermedian.merge(L8summermedian);

var NDVIcollection = maincollection.select('NBR')

var NDVIchart = ui.Chart.image.seriesByRegion({
  imageCollection: NDVIcollection,
  regions: region,
  reducer: ee.Reducer.mean(), //type of reduction. See ee.Reducers for other kinds of reductions
  scale: 30, //spatial scale of MODIS product
  seriesProperty: 'NAME'  //property of roi to display in map
})
  .setOptions({
    title: 'Region Mean NBR from June 1 to July 31',
    vAxis: {title: 'NBR', maxValue: 1, minValue: -1},
    hAxis: {title: 'year', format: 'YYYY', gridlines: {count: 5}},
  })
  
print(NDVIchart)
