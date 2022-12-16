var fires = ee.FeatureCollection("users/dgodwin/Reproject_Fire_Polygons"),
    geometry = /* color: #d63000 */ee.Geometry.Point([-123.091123046875, 40.89708050390358]),
    mapboundary = 
    /* color: #98ff00 */
    /* displayProperties: [
      {
        "type": "rectangle"
      }
    ] */
    ee.Geometry.Polygon(
        [[[-123.59642413761442, 41.40802878427711],
          [-123.59642413761442, 40.46189407449804],
          [-122.61864093448942, 40.46189407449804],
          [-122.61864093448942, 41.40802878427711]]], null, false);

//Use this to create the main collection.
//Each element of the collection represents the surface reflectance bands, NDVI, and NDWI between May 28 and August 28 of the years 1997-2017
//There is no data for 2012, as it represents a gap in coverage between Landsat 5 and 8, during which Landsat 7 produced poor quality data

// Declare years and dates of interest, this can be changed at will without changing any other code
var L5startYear = 2000;
var L5endYear = 2011; //Always skip 2012, as there is no data
var L8startYear = 2013; //Always skip 2012, as there is no data
var L8endYear = 2022;
var startMonth = 6;
var startDay = 1;
var endMonth = 7;
var endDay = 31;

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
var L5collection = ee.ImageCollection('LANDSAT/LT05/C02/T1_L2')
                    .filter(ee.Filter.calendarRange(L5startYear, L5endYear, "year"))
                    .filter(ee.Filter.calendarRange(startMonth, endMonth, "month"))
                    .filterBounds(region)
                    .map(maskL457sr);


//Define the function to add NDVI and NDWI
var L5addNDVIandNDWIandNBR = function(image) {
  var ndvi = image.normalizedDifference(['SR_B5', 'SR_B4']).rename('NDVI');
  var ndwi = image.normalizedDifference(['SR_B2', 'SR_B4']).rename('NDWI');
  var nbr = image.normalizedDifference(['SR_B4', 'SR_B7']).rename('NBR');
  return image.addBands(ndvi).addBands(ndwi).addBands(nbr);
};

//Add the NDVI and NDWI to the image
var L5collection = L5collection.map(L5addNDVIandNDWIandNBR)

var L5years = ee.List.sequence(L5startYear, L5endYear);
// Map a function to select data within the year and apply median reducer
var L5summermedian = ee.ImageCollection.fromImages(
    L5years.map(function(year) {
      var startDate = ee.Date.fromYMD(year, startMonth, startDay);
      var endDate = ee.Date.fromYMD(year, endMonth, endDay);
      var annual = L5collection
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
var L8collection = ee.ImageCollection('LANDSAT/LC08/C02/T1_L2')
                    .filter(ee.Filter.calendarRange(L8startYear, L8endYear, "year"))
                    .filter(ee.Filter.calendarRange(startMonth, endMonth, "month"))
                    .filterBounds(region)
                    .map(maskL8sr);

//Define the function to add NDVI and NDWI
var L8addNDVIandNDWIandNBR = function(image) {
  var ndvi = image.normalizedDifference(['SR_B6', 'SR_B5']).rename('NDVI');
  var ndwi = image.normalizedDifference(['SR_B3', 'SR_B5']).rename('NDWI');
  var nbr = image.normalizedDifference(['SR_B5', 'SR_B7']).rename('NBR');
  return image.addBands(ndvi).addBands(ndwi).addBands(nbr);
};

//Add the NDVI and NDWI to the image
var L8collection = L8collection.map(L8addNDVIandNDWIandNBR)

var L8years = ee.List.sequence(L8startYear, L8endYear);
// Map a function to select data within the year and apply median reducer
var L8summermedian = ee.ImageCollection.fromImages(
    L8years.map(function(year) {
      var startDate = ee.Date.fromYMD(year, startMonth, startDay);
      var endDate = ee.Date.fromYMD(year, endMonth, endDay);
      var annual = L8collection
        .filterDate(startDate, endDate)
        .median();
      return annual
        .set('year', year)
        .set('system:time_start', ee.Date.fromYMD(year, 1, 1).format("YYYY_MM_dd"))
    })
  );

var maincollection = L5summermedian.merge(L8summermedian);

var comp = maincollection.select("NBR")
print (comp, "comp")
var mask = fires.geometry()
var region = fires.geometry()
Map.addLayer(fires)
// Define GIF visualization parameters.
var args = {
  'region': mapboundary,
  'dimensions': 600,
  'crs': 'EPSG:3857',
  'framesPerSecond': 4
};

var text = require('users/gena/packages:text'); // Import gena's package which allows text overlay on image
var style = require('users/gena/packages:style');
var utils = require('users/gena/packages:utils');

var annotations = [
  {position: 'right', offset: '1%', margin: '1%', property: 'label', scale: 500} //large scale because image if of the whole world. Use smaller scale otherwise
  ]
  
function addText(image){

  var timeStamp = ee.String('Date: ').cat(ee.String(image.get('year')).slice(0,4)); //convert time stamp to string 
  var image = image.visualize({ //convert each frame to RGB image explicitly since it is a 1 band image
      forceRgbOutput: true,
      min: -1,
      max: 1,
      palette: ['640000', 'ff0000', 'ffff00', '00c800', '006400']
    }).set({'label':timeStamp}); // set a property called label for each image
  
  var annotated = text.annotateImage(image, {}, geometry, annotations); // create a new image with the label overlayed using gena's package

  return annotated 
}

var collection = comp.map(addText) //add time stamp to all images
  
var firecollection = ee.FeatureCollection(mask);
  
// Define an empty image to paint features to.
var empty = ee.Image().byte();

// Paint country feature edges to the empty image.
var fireOutline = empty
  .paint({featureCollection: firecollection, color: 1, width: 1})
  // Convert to an RGB visualization image; set line color to black.
  .visualize({palette: '000000'});

var visParams = {
  min: -1,
  max: 1,
  palette: ['640000', 'ff0000', 'ffff00', '00c800', '006400']
};

var geometryGradientBar = ee.Geometry.Polygon(
        [[[-122.92850805639536,40.69853840573953],
        [-122.71976782202036,40.69853840573953],
        [-122.71976782202036,40.7568179549335],
        [-122.92850805639536,40.7568179549335]]], null, false);
var min = -1;
var max = 1;
var textProperties = {
  fontSize: 14,
  textColor: 'ffffff',
  outlineColor: '000000',
  outlineWidth: 0,
  outlineOpacity: 0.6
};
var labels = ee.List.sequence(min, max);
var gradientBar = style.GradientBar.draw(geometryGradientBar, {
  min: min, max: max, palette: visParams.palette, labels: labels,
  format: '%.0f', text: textProperties
});

// Map a blend operation over the temperature collection to overlay the country
// border outline image on all collection images.
var collection = collection.map(function(img) {
  return img.blend(fireOutline).blend(gradientBar);
});

print(ui.Thumbnail(collection,args));
