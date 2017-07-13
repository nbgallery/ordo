define(['jquery', 'base/js/namespace', 'base/js/events'], function($, Jupyter, events) {
  console.log("...Ordo loaded... grading capabilities initiated");
  /* feedback
   *  Capture output_appended.OutputArea event for the result value
   *  Capture finished_execute.CodeCell event for the data value
   *  check for a solution in cell metadata
   *  if exists:
   *    check only one area appended (ends recursion)
   *    if true:
   *      check result against solution
   *      if result correct:
   *        append the success message
   *      if result incorrect:
   *        append the failure message
   */
  var feedback = function () {
    events.on('output_appended.OutputArea', function(event,type,result,md,html) {
      events.on('finished_execute.CodeCell', function(evt, obj){
        solution = obj.cell.metadata.ordo_solution;
        if (solution != undefined) {
          if (html.parent().parent().children().toArray().length == 1) {
            if (JSON.stringify(solution) == JSON.stringify(obj.cell.output_area.outputs[0].data)) {
              if (obj.cell.metadata.ordo_success == undefined) {
                feedback = "<p class='ordo_feedback' style='color:green'><b>Correct!</b></p>"
              } else {
                feedback = "<p class='ordo_feedback' style='color:green'><b>" + obj.cell.metadata.ordo_success + "</b></p>"
              }
            } else {
              if (obj.cell.metadata.ordo_failure == undefined) {
                feedback = "<p class='ordo_feedback' style='color:red'><b>Incorrect.</b></p>"
              } else {
                feedback = "<p class='ordo_feedback' style='color:red'><b>" + obj.cell.metadata.ordo_failure + "</b></p>"
              }
            }
            obj.cell.output_area.append_output({
              "output_type" : "display_data",
              "data" : {
                "text/html": feedback
              },
              "metadata" : {}
            });
          }
        }
      });
    });
  }
  /* makeOutputButton
   *  Capture select cell event for the cell data
   *  check cell type is code
   *  if true:
   *    check the cell is the same as the formerly selected cell
   *    if true:
   *      return with no action
   *    if false:
   *      Remove the button from the formerly selected cell
   *      check if the cell has been run already
   *      if true:
   *        append a button for the user to click which will:
   *        make ordo_solution = output_area.outputs[0]
   */
  var makeOutputButton = function () {
    var currCell = undefined;
    events.on('select.Cell', function(event, data) {
      newCell = data.cell;
      if(newCell == currCell){
        return;
      } else {
        $(".make-ordo-solution").remove();
        currCell = newCell;
        if(currCell.cell_type == "code") {
          if(currCell.output_area.outputs.length > 0) {
            if(currCell.output_area.outputs[0].output_type == "execute_result") {
              $(".selected .output_area").first().append("<button type='button' class='btn btn-primary make-ordo-solution'>make solution</button>");
              $(".make-ordo-solution").on("click", function() {
                console.log("updated metadata");
                currCell.metadata.ordo_solution = currCell.output_area.outputs[0].data;
              });
            }
          }
        }
      }
    }); 
  }
  var allOutputsButton = function () {
    var myFunc = function () {
      cells = Jupyter.notebook.get_cells();
      for(i=0;i < cells.length;i++) {
        if(cells[i].cell_type == "code") {
          if(cells[i].output_area != undefined) {
            if(cells[i].output_area.outputs.length > 0) {
              if(cells[i].output_area.outputs[0].output_type == "execute_result") {
                cells[i].metadata.ordo_solution = cells[i].output_area.outputs[0].data
                console.log("updated metadata");
                //console.log(cells[i].output_area.outputs[0].data);
                //console.log(cells[i].metadata.ordo_solution);
              }
            }
          }
        }
      }
    };
    var action = {
      icon: 'fa-lightbulb-o',
      help: 'Make all outputs solutions',
      help_index: 'zz',
      handler: myFunc
    };
    var prefix = 'allOutputsButton';
    var action_name = 'show-button';
    var full_action_name = Jupyter.actions.register(action, action_name,prefix);
    Jupyter.toolbar.add_buttons_group([full_action_name]);
  }
  var allFuncs = function() {
    feedback();
    makeOutputButton();
    allOutputsButton();
  }
  return {
    load_ipython_extension: allFuncs
  }
});
