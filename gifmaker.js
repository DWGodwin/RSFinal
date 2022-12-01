//load NDWI
var col = ee.ImageCollection('LANDSAT/LE07/C01/T1_32DAY_NDWI').select('NDWI');
//load county shapefiles in order to clip result
var countyData = ee.FeatureCollection('TIGER/2018/Counties');
var countyConnect = countyData.filter(ee.Filter.eq('STATEFP', '06'));
var countyConnectDiss = countyConnect.union(100);
var mask = countyConnectDiss
//define bounding frame of animation
var region = ee.Geometry.Polygon(
  [[[-126.36996732702173, 42.88647401853699],
    [-126.36996732702173, 32.0388653264998],
    [-112.57113920202173, 32.0388653264998],
    [-112.57113920202173, 42.88647401853699]]], null, false
    );
//define function to add date to images so they can be joined to each other.
col = col.map(function(img) {
  var doy = ee.Date(img.get('system:time_start')).getRelative('day', 'year');
  return img.set('doy', doy);
});
var distinctDOY = col.filterDate('2013-01-01', '2014-01-01');
// Define a filter that identifies which images from the complete collection
// match the DOY from the distinct DOY collection.
var filter = ee.Filter.equals({leftField: 'doy', rightField: 'doy'});

// Define a join.
var join = ee.Join.saveAll('doy_matches');

// Apply the join and convert the resulting FeatureCollection to an
// ImageCollection.
var joinCol = ee.ImageCollection(join.apply(distinctDOY, col, filter));
// Apply median reduction among matching DOY collections.
var comp = joinCol.map(function(img) {
  var doyCol = ee.ImageCollection.fromImages(
    img.get('doy_matches')
  );
  return doyCol.reduce(ee.Reducer.median());
});
//define graphical style for gif
var visParams = {
  min: 0.0,
  max: 1.0,
  palette: ['0000ff', '00ffff', 'ffff00', 'ff0000', 'ffffff'],
};
var rgbVis = comp.map(function(img) {
  return img.visualize(visParams).clip(fires);
});
// Define GIF visualization parameters.
var gifParams = {
  'region': region,
  'dimensions': 600,
  'crs': 'EPSG:3857',
  'framesPerSecond': 10
};

// Print the GIF URL to the console.
print(rgbVis.getVideoThumbURL(gifParams));
