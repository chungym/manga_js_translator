
function cv_extract_dataURL(outCanvas)
{

    let debug_plot = false;

    
    let src = cv.imread('canvas_in');
    let bw = cv.Mat.zeros(src.rows, src.cols, cv.CV_8UC1);
    let inter = cv.Mat.zeros(src.rows, src.cols, cv.CV_8UC1);
    let contours_large = new cv.Mat(src.rows, src.cols, cv.CV_8UC1, new cv.Scalar(255,255,255));
    let mask = cv.Mat.zeros(src.rows, src.cols, cv.CV_8UC1);
    let dst = cv.Mat.zeros(src.rows, src.cols, cv.CV_8UC3);
    
    cv.cvtColor(src, src, cv.COLOR_RGBA2GRAY, 0);
    
    cv.threshold(src, bw, 150, 255, cv.THRESH_OTSU);
    
    let M = cv.Mat.ones(3, 3, cv.CV_8U);
    let M2 = cv.Mat.ones(5, 5, cv.CV_8U);
    let anchor = new cv.Point(-1, -1);
    let M3 = cv.getStructuringElement(cv.MORPH_CROSS, new cv.Size(Math.ceil(src.cols/256)|1, Math.ceil(src.cols/256)|1), anchor);
    cv.erode(bw, inter, M, anchor, 1, cv.BORDER_CONSTANT, cv.morphologyDefaultBorderValue());

    // good contours, no processing required
    let contours_good = new cv.MatVector();
    let hierarchy_good = new cv.Mat();
    cv.findContours(inter, contours_good, hierarchy_good, cv.RETR_TREE, cv.CHAIN_APPROX_SIMPLE);

    // proccess disconnected contours
    let contours_bad = new cv.MatVector();
    let hierarchy_bad = new cv.Mat();

    //cv.morphologyEx(bw, contours_large, cv.MORPH_OPEN, M3, anchor, 1, cv.BORDER_CONSTANT, cv.morphologyDefaultBorderValue());
    cv.erode(bw, contours_large, M3, anchor, 3, cv.BORDER_CONSTANT, cv.morphologyDefaultBorderValue());
    cv.dilate(contours_large, contours_large, M3, anchor, 2, cv.BORDER_CONSTANT, cv.morphologyDefaultBorderValue());

    cv.findContours(contours_large, contours_bad, hierarchy_bad, cv.RETR_TREE, cv.CHAIN_APPROX_SIMPLE);
    
    
    //draw back large contours to original image
    // to close large contours

    let convex_hulls = new cv.MatVector();
    for (let i = 0; i < contours_bad.size(); ++i) {
      
      if (hierarchy_bad.intPtr(0,i)[2] !=-1){
    
        let tmp = new cv.Mat();
        // You can try more different parameters
        cv.convexHull(contours_bad.get(i), tmp, false, true);

        let perimeter = cv.arcLength(tmp, true);
        if ( perimeter >= (src.rows + src.cols)*0.10){
          convex_hulls.push_back(tmp);   
        }

      }   
    }
    cv.drawContours(inter , convex_hulls, -1, new cv.Scalar(0, 0, 0), 2, cv.LINE_4, hierarchy_bad = new cv.Mat(), maxLevel = cv.INT_MAX, offset = new cv.Point(0,0));
    cv.drawContours(inter , contours_bad, -1, new cv.Scalar(255, 255, 255), -1, cv.LINE_8, hierarchy_bad = new cv.Mat(), maxLevel = cv.INT_MAX, offset = new cv.Point(0,0));   
    //make resultant lines a bit thicker
    cv.erode(inter, inter, M, anchor, 1, cv.BORDER_CONSTANT, cv.morphologyDefaultBorderValue());
    convex_hulls.delete();


    cv.findContours(inter, contours_bad, hierarchy_bad, cv.RETR_TREE, cv.CHAIN_APPROX_SIMPLE);


    // make the image colored
    let matVecTemp = new cv.MatVector();
    matVecTemp.push_back(inter);
    matVecTemp.push_back(inter);
    matVecTemp.push_back(inter);
    cv.merge(matVecTemp, dst)
    matVecTemp.delete();
      
    //combine contours
    let contours = new cv.MatVector();
    let hierarchy = new cv.Mat();
    for (let i = 0; i < contours_good.size(); ++i){contours.push_back(contours_good.get(i));}
    for (let i = 0; i < contours_bad.size(); ++i){contours.push_back(contours_bad.get(i));}

    matVecTemp = new cv.MatVector();
    matVecTemp.push_back(hierarchy_good);
    matVecTemp.push_back(hierarchy_bad);
    cv.hconcat(matVecTemp, hierarchy);
    matVecTemp.delete();

    let bubbleContours = new cv.MatVector();
    for (let i = 0; i < contours.size(); ++i) {

      //check nesting

      //empty inside, skip 
      if (hierarchy.intPtr(0,i)[2] ==-1){
        continue;
      }

      if (debug_plot){
        cv.drawContours(dst, contours, i, new cv.Scalar(255, 0, 0), 1, cv.LINE_8, hierarchy, 0);
      }
  
      let perimeter = cv.arcLength(contours.get(i), true);
      if ( perimeter < (src.rows + src.cols)*0.10){
        continue;
      }

      if (debug_plot){
        cv.drawContours(dst, contours, i, new cv.Scalar(255, 0, 255), 1, cv.LINE_8, hierarchy, 0);
      }
  
      let area = cv.contourArea(contours.get(i), false);
      let rect = cv.boundingRect(contours.get(i));
      let rectArea = rect.width * rect.height;
      let extent = area / rectArea;


      let areaRatio = area/ (src.rows*src.cols);
      
      //check size
      if (areaRatio < 0.0025 || rectArea/ (src.rows*src.cols) > 0.2){
        continue;
      }

      if (debug_plot)
      {
        cv.drawContours(dst, contours, i, new cv.Scalar(0, 0, 255), 1, cv.LINE_8, hierarchy, 0);
      }

      let hull = new cv.Mat();

      cv.convexHull(contours.get(i), hull, false, true);
      let hullPerimeter = cv.arcLength(hull , true);

      //check convexity
      if ( (true || extent > 0.33)  && ( (perimeter < 1.5* hullPerimeter && areaRatio > 0.01) || (perimeter < 1.33* hullPerimeter && areaRatio > 0.005 && areaRatio < 0.01) || (perimeter < 1.10* hullPerimeter && areaRatio <= 0.005) ) ){

        let color = new cv.Scalar(255, 255, 255);

        cv.drawContours(mask , contours, i, color, 1, cv.LINE_8, hierarchy, 0, new cv.Point(0,0));

        if (debug_plot){
        
          cv.drawContours(dst, contours, i, new cv.Scalar(0, 255, 0), 1, cv.LINE_8, hierarchy, 0);

        }
      }

      hull.delete();
        

    }
    
    cv.findContours(mask, bubbleContours, hierarchy, cv.RETR_TREE, cv.CHAIN_APPROX_SIMPLE);
    //bubbleContours.push_back(contours.get(i));


    let dataURL_array = [];
    if (bubbleContours.size() > 0){
    

      for (let i = bubbleContours.size()-1; i >= 0; i--) {


        if (hierarchy.intPtr(0,i)[2] ==-1){

          let perimeter = cv.arcLength(bubbleContours.get(i), true);
          if ( perimeter < (src.rows + src.cols)*0.10){
            continue;
          }


          let rect = cv.boundingRect(bubbleContours.get(i));

          //create mask in case bounding boxes overlap with each other
          let roi_mask = cv.Mat.zeros(rect.height, rect.width, cv.CV_8UC1);
          let roi_mask_inv = new cv.Mat();
          let color = new cv.Scalar(255, 255, 255);
          cv.drawContours(roi_mask , bubbleContours, i, color, -1, cv.LINE_8, hierarchy, 0, new cv.Point(-rect.x,-rect.y));

          // draw a black border, in case the contour is the same as its bounding rect
          cv.rectangle(roi_mask, new cv.Point(0,0), new cv.Point(rect.width, rect.height), new cv.Scalar(0, 0, 0), 2, cv.LINE_4, 0);

          cv.erode(roi_mask, roi_mask, M2, anchor, 1, cv.BORDER_CONSTANT, cv.morphologyDefaultBorderValue());
          cv.bitwise_not(roi_mask, roi_mask_inv);

          let bw_roi = bw.roi(rect).clone();
          let roi = new cv.Mat();
          cv.bitwise_and(bw_roi, roi_mask, roi);
          cv.bitwise_or(roi, roi_mask_inv, roi);


          let black_ratio = (rect.width * rect.height - cv.countNonZero(roi)) / cv.contourArea(bubbleContours.get(i), false);
          if (debug_plot){
            console.log(black_ratio );
          }

          if (black_ratio > 0.015 && black_ratio < 0.333 ){
            //const outBase64 =  cv.imencode('.jpg', roi).toString('base64'); // Perform base64 encoding
            //const dataURL='data:image/jpeg;base64,'+outBase64; //Create insert into HTML compatible <img> tag
            
        
            let src_roi = bw.roi(rect).clone();
            cv.bitwise_and(src_roi, roi_mask, src_roi);
            cv.bitwise_or(src_roi, roi_mask_inv, src_roi);

            cv.imshow('canvas_out', src_roi);
            let out_dataURL = outCanvas.toDataURL('image/jpeg');

            let Moments = cv.moments(bubbleContours.get(i), false);

            let dataURL_obj = {
              dataURL: out_dataURL, 
              cx: Moments.m10/Moments.m00, 
              cy: Moments.m01/Moments.m00, 
              ratio: rect.width/rect.height,
              maxWidth: rect.width
            };

            dataURL_array.push(dataURL_obj);

            src_roi.delete();
        
            if (debug_plot){
              console.log(out_dataURL);
            }
          }

          roi_mask.delete(); roi_mask_inv.delete(); bw_roi.delete(); roi.delete();
        }
      }

    }
    
    
    if (debug_plot){

        cv.imshow('canvas_out', contours_large);
        var out_dataURL = outCanvas.toDataURL('image/jpeg');
        console.log(out_dataURL);

      cv.imshow('canvas_out', dst);
      var out_dataURL = outCanvas.toDataURL('image/jpeg');
      console.log(out_dataURL);

      cv.imshow('canvas_out', mask);
      out_dataURL = outCanvas.toDataURL('image/jpeg');
      console.log(out_dataURL);
    }

    src.delete(); bw.delete(); contours_large.delete(); mask.delete(); inter.delete(); dst.delete(); 
    M.delete(); M2.delete(); M3.delete(); 
    contours.delete(); bubbleContours.delete(); hierarchy.delete();


    // sort from right to left
    dataURL_array.sort(function(a, b) {
      return b.cx-a.cx;
    });

    // sort from top to bottom if the difference if large
    dataURL_array.sort(function(a, b) {
      if (Math.abs(b.cy-a.cy) > 0.75 * (a.maxWidth/a.ratio+b.maxWidth/b.ratio))
      {
        return a.cy-b.cy;
      }
      else
      {
        return 0;
      }
    });
    

    return dataURL_array;

}