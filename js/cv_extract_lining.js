
const median = arr => {
    let middle = Math.floor(arr.length / 2);
      arr = [...arr].sort((a, b) => a - b);
    return arr.length % 2 !== 0 ? arr[middle] : (arr[middle - 1] + arr[middle]) / 2;
  };
  

function cv_extract_dataURL_lining(outCanvas)
{

    let debug_plot = false;

    let src = cv.imread('canvas_in');

    let src_hsv = new cv.Mat();
    let temp = new cv.Mat(src.rows, src.cols, cv.CV_8UC3, new cv.Scalar(255,0,255)); //initialized in HSV
    let dst = new cv.Mat(src.rows, src.cols, cv.CV_8UC3, new cv.Scalar(255,0,255)); //initialized in HSV



    cv.cvtColor(src, src_hsv, cv.COLOR_RGB2HSV_FULL, 0);


    let whiteLower = new cv.Mat(src_hsv.rows, src_hsv.cols, src_hsv.type(), [0, 0, 240, 0]);
    let whiteUpper = new cv.Mat(src_hsv.rows, src_hsv.cols, src_hsv.type(), [255, 25, 255, 255]);
    let whiteMask = new cv.Mat();
    cv.inRange(src_hsv, whiteLower, whiteUpper, whiteMask)

    //find all words that are small
    let contours_black = new cv.MatVector();
    let hierarchy_black = new cv.Mat();
    cv.findContours(whiteMask, contours_black, hierarchy_black, cv.RETR_TREE, cv.CHAIN_APPROX_SIMPLE);


    for (let i = 0; i < contours_black.size(); ++i) {
        //check it is an inner contour
        if (hierarchy_black.intPtr(0,i)[3] ==-1){
            continue;
        }

        //check if it is small
        let rect = cv.boundingRect(contours_black.get(i));
        let area = rect.width * rect.height;
        if ( area >= (src.rows * src.cols)*0.005){
            continue;  
        }

        cv.drawContours(whiteMask, contours_black, i, new cv.Scalar(255, 255, 255), -1, cv.LINE_8, hierarchy_bad = new cv.Mat(), maxLevel = cv.INT_MAX, offset = new cv.Point(0,0));     

    }

    src_hsv.copyTo(temp, whiteMask);
    whiteMask.delete(); whiteLower.delete(); whiteUpper.delete();
    

    // extract non-white color by taking away greyish color 
    let blackLower = new cv.Mat(src_hsv.rows, src_hsv.cols, src_hsv.type(), [0, 0, 70, 0]);
    let blackUpper = new cv.Mat(src_hsv.rows, src_hsv.cols, src_hsv.type(), [255, 127, 255, 255]);
    let blackMask = new cv.Mat();
    cv.inRange(temp, blackLower, blackUpper, blackMask)
    cv.bitwise_not(blackMask, blackMask);
    temp.copyTo(dst, blackMask);

    // stricter rules
    blackLower = new cv.Mat(src_hsv.rows, src_hsv.cols, src_hsv.type(), [0, 0, 50, 0]);
    blackUpper = new cv.Mat(src_hsv.rows, src_hsv.cols, src_hsv.type(), [255, 225, 255, 255]);
    blackMask = new cv.Mat();
    cv.inRange(dst, blackLower, blackUpper, blackMask)
    cv.bitwise_not(blackMask, blackMask);

    cv.morphologyEx(blackMask, blackMask, cv.MORPH_OPEN, new cv.Mat.ones(2, 2, cv.CV_8U), new cv.Point(-1,-1), 1, cv.BORDER_CONSTANT, cv.morphologyDefaultBorderValue());
    cv.morphologyEx(blackMask, blackMask, cv.MORPH_CLOSE, new cv.Mat.ones(2, 2, cv.CV_8U), new cv.Point(0,0), 1, cv.BORDER_CONSTANT, cv.morphologyDefaultBorderValue());

    //partitioning
    cv.cvtColor(dst, dst, cv.COLOR_HSV2RGB_FULL, 0);
    cv.cvtColor(dst, temp, cv.COLOR_RGB2GRAY, 0);

    cv.threshold(temp, temp, 254, 255, cv.THRESH_BINARY);



    cv.findContours(temp, contours_black, hierarchy_black, cv.RETR_TREE, cv.CHAIN_APPROX_SIMPLE);

    area_array = [];
    for (let i = 0; i < contours_black.size(); ++i) {
        let rect = cv.boundingRect(contours_black.get(i));
        let area = rect.width * rect.height;
        if ( area < (src.rows * src.cols)*0.01 && area>40 ){
            area_array.push(Math.sqrt(area));  
        }
    }

    // clustering by euclidean distance 
    area_median_odd = median(area_array);
    console.log(area_median_odd);
    area_array.length=0;
    let M = cv.Mat.ones( Math.ceil(area_median_odd*1.5)|1, 1, cv.CV_8U); //erode only vertically in case lines of different colors are to close together
    cv.erode(temp, temp, M, new cv.Point(-1, -1), 2, cv.BORDER_CONSTANT, cv.morphologyDefaultBorderValue());

    // draw a black border, in case a contour is at the border
    cv.rectangle(temp, new cv.Point(0,0), new cv.Point(src.cols-1, src.rows-1), new cv.Scalar(255, 255, 255), 1, cv.LINE_4, 0);


    if (debug_plot)
    {

      cv.imshow('canvas_out', temp);
      let out_dataURL = outCanvas.toDataURL('image/jpeg');
      console.log(out_dataURL);

    }


    cv.findContours(temp, contours_black, hierarchy_black, cv.RETR_TREE, cv.CHAIN_APPROX_SIMPLE);

    console.log(contours_black.size());


    let bw_new = new cv.Mat(dst.rows, dst.cols, cv.CV_8UC1, new cv.Scalar(255,255,255)); //initialized in black and white

    for (let i = 0; i < contours_black.size(); ++i) {
        let rect = cv.boundingRect(contours_black.get(i));


        // reject large or small boxes
        if (rect.width * rect.height > 0.3* src.cols * src.rows){continue;}
        if (rect.width * rect.height < 50){continue;}

        //create mask in case bounding boxes overlap with each other
        let roi_mask = cv.Mat.zeros(rect.height, rect.width, cv.CV_8UC1);
        let roi_temp = new cv.Mat();
        
        let color = new cv.Scalar(255, 255, 255);
        cv.drawContours(roi_mask , contours_black, i, color, -1, cv.LINE_8, hierarchy_black, 0, new cv.Point(-rect.x,-rect.y));

        // draw a black border, in case the contour is the same as its bounding rect
        cv.rectangle(roi_mask, new cv.Point(0,0), new cv.Point(rect.width, rect.height), new cv.Scalar(0, 0, 0), 2, cv.LINE_4, 0);

        cv.erode(roi_mask, roi_mask, cv.Mat.ones(3, 3, cv.CV_8U), new cv.Point(-1,-1), 1, cv.BORDER_CONSTANT, cv.morphologyDefaultBorderValue());

        roi_temp = dst.roi(rect).clone();
        let roi_black_temp = blackMask.roi(rect).clone();

        let roi = new cv.Mat(rect.height, rect.width, cv.CV_8UC3, new cv.Scalar(255,255,255));
        let roi_black = new cv.Mat(rect.height, rect.width, cv.CV_8UC3, new cv.Scalar(0,0,0));
        roi_temp.copyTo(roi, roi_mask);
        roi_black_temp.copyTo(roi_black, roi_mask);


        // final filtering by same color

        let color_average_rgb = cv.mean(roi, roi_black);
        let color_average_mat = new cv.Mat(1, 1, cv.CV_8UC3, new cv.Scalar(color_average_rgb[0], color_average_rgb[1], color_average_rgb[2]));
        cv.cvtColor(color_average_mat, color_average_mat, cv.COLOR_RGB2HSV_FULL, 0);

        console.log(color_average_mat.data[0], color_average_mat.data[1], color_average_mat.data[2]);

        let roi_hsv = new cv.Mat();
        cv.cvtColor(roi.clone(), roi_hsv, cv.COLOR_RGB2HSV_FULL, 0);

        roi_hsv.convertTo(roi_hsv, cv.CV_16S);

        let color_average = [color_average_mat.data[0], color_average_mat.data[1], color_average_mat.data[2]];

        //rotate so that the target color is centered

        let roi_hsv_forward = new cv.Mat();
        let roi_hsv_backward = new cv.Mat();

        let rotation = 128 - color_average[0];
        cv.add(roi_hsv, new cv.Mat(roi.rows, roi.cols, cv.CV_16SC3, [rotation, 0, 0, 0]), roi_hsv_forward);
        rotation = -(256-rotation);
        cv.add(roi_hsv, new cv.Mat(roi.rows, roi.cols, cv.CV_16SC3, [rotation, 0, 0, 0]), roi_hsv_backward);

        roi_hsv_forward.convertTo(roi_hsv_forward, cv.CV_8U);
        roi_hsv_backward.convertTo(roi_hsv_backward, cv.CV_8U);

        roi_hsv_backward.copyTo(roi_hsv_forward, roi_hsv_backward); //copy non-black area
        roi_hsv_forward.convertTo(roi_hsv, cv.CV_8U);


        roi_hsv_forward.delete(); roi_hsv_backward.delete();


        let colorLower;
        let colorUpper;

        //black text, ignore hue and saturation;
        // encoding problem, since black color may have any HS 
        if (color_average[2]<20)
        {
          colorLower = new cv.Mat(roi.rows, roi.cols, roi.type(), [0, 0, Math.max(0,color_average[2]-50), 0]);
          colorUpper = new cv.Mat(roi.rows, roi.cols, roi.type(), [255, 255, Math.min(255,color_average[2]+50), 255]);
        }
        else
        {
          colorLower = new cv.Mat(roi.rows, roi.cols, roi.type(), [128-20, Math.max(0,color_average[1]-150), Math.max(0,color_average[2]-50), 0]);
          colorUpper = new cv.Mat(roi.rows, roi.cols, roi.type(), [128+20, Math.min(255,color_average[1]+150), Math.min(255,color_average[2]+50), 255]);
        }

        let colorMask = new cv.Mat();
        cv.inRange(roi_hsv, colorLower, colorUpper, colorMask)

        // skip empty 
        if ( cv.countNonZero(colorMask) < 10 ){continue;}

        roi = new cv.Mat(rect.height, rect.width, cv.CV_8UC3, new cv.Scalar(255,255,255));
        roi_temp.copyTo(roi, colorMask);

        cv.cvtColor(roi, roi, cv.COLOR_RGB2GRAY, 0);
        cv.threshold(roi, roi, 254, 255, cv.THRESH_BINARY);

        // clone the final filtered parts to a new b&w image
        let bw_roi = bw_new.roi(rect);
        roi.copyTo(bw_roi, colorMask); 

        cv.imshow('canvas_out', roi);
        let out_dataURL = outCanvas.toDataURL('image/jpeg');


        roi_mask.delete(); roi.delete(); roi_black.delete(); roi_temp.delete(); roi_black_temp.delete(); 
        colorLower.delete(); colorUpper.delete(); roi_hsv.delete(); colorMask.delete();

        if (debug_plot){
            console.log(out_dataURL);
        }

    }


    // clustering by euclidean distance 
    M = cv.Mat.ones( Math.ceil(area_median_odd*1.5)|1, Math.ceil(area_median_odd*1.5)|1, cv.CV_8U);  // now we group lines horizontally
    cv.erode(bw_new, temp, M, new cv.Point(-1, -1), 2, cv.BORDER_CONSTANT, cv.morphologyDefaultBorderValue());
    cv.dilate(temp, temp, M, new cv.Point(-1, -1), 2, cv.BORDER_CONSTANT, cv.morphologyDefaultBorderValue());
    

    // draw a black border, in case a contour is at the border
    cv.rectangle(temp, new cv.Point(0,0), new cv.Point(src.cols-1, src.rows-1), new cv.Scalar(255, 255, 255), 1, cv.LINE_4, 0);

    cv.findContours(temp, contours_black, hierarchy_black, cv.RETR_TREE, cv.CHAIN_APPROX_SIMPLE);


    if (debug_plot)
    {

      cv.imshow('canvas_out', temp);
      let out_dataURL = outCanvas.toDataURL('image/jpeg');
      console.log(out_dataURL);

    }


    let dataURL_array = [];
    for (let i = 0; i < contours_black.size(); ++i) {
        let rect = cv.boundingRect(contours_black.get(i));


        // reject large or small boxes
        if (rect.width * rect.height > 0.3* src.cols * src.rows){continue;}
        if (rect.width * rect.height < 50){continue;}

        //create mask in case bounding boxes overlap with each other
        let roi_mask = cv.Mat.zeros(rect.height, rect.width, cv.CV_8UC1);
        let roi_temp = new cv.Mat();
        
        let color = new cv.Scalar(255, 255, 255);
        cv.drawContours(roi_mask , contours_black, i, color, -1, cv.LINE_8, hierarchy_black, 0, new cv.Point(-rect.x,-rect.y));
        // draw a black border, in case the contour is the same as its bounding rect
        cv.rectangle(roi_mask, new cv.Point(0,0), new cv.Point(rect.width, rect.height), new cv.Scalar(0, 0, 0), 2, cv.LINE_4, 0);
        cv.erode(roi_mask, roi_mask, cv.Mat.ones(3, 3, cv.CV_8U), new cv.Point(-1,-1), 1, cv.BORDER_CONSTANT, cv.morphologyDefaultBorderValue());

        roi_temp = dst.roi(rect).clone();

        let roi = new cv.Mat(rect.height, rect.width, cv.CV_8UC3, new cv.Scalar(255,255,255));

        roi_temp.copyTo(roi, roi_mask);

        cv.imshow('canvas_out', roi);
        let out_dataURL = outCanvas.toDataURL('image/jpeg');

        let dataURL_obj = {
          dataURL: out_dataURL, 
          cx: rect.x+rect.width/2, 
          cy: rect.y+rect.height/2, 
          ratio: rect.width/rect.height,
          maxWidth: rect.width
        };

        dataURL_array.push(dataURL_obj);

        roi_mask.delete(); roi.delete(); roi_temp.delete(); 

        if (debug_plot){
            console.log(out_dataURL);
        }

    }




    if (debug_plot)
    {

      cv.imshow('canvas_out', bw_new);
      var out_dataURL = outCanvas.toDataURL('image/jpeg');
      console.log(out_dataURL);

    }

    src.delete();
    src_hsv.delete();
    dst.delete();
    temp.delete();
    bw_new.delete();

    hierarchy_black.delete(); contours_black.delete();
    blackMask.delete(); blackLower.delete(); blackUpper.delete();

    // sort from right to left
    dataURL_array.sort(function(a, b) 
    {
      return b.cx-a.cx;
    });
  
    /*
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
    */
      
  
    return dataURL_array;



}