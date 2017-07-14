define([
  'jquery',
  'base/js/namespace',
  'base/js/events'
],  function(
  $,
  jupyter,
  events
) {
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
            if(eqauls(solution,obj.cell.output_area.outputs[0].data)) {
            //if (JSON.stringify(solution) == JSON.stringify(obj.cell.output_area.outputs[0].data)) {
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
  var eqauls = function(obj1, obj2) {
    for(var p in obj1){
      if(obj1.hasOwnProperty(p) !== obj2.hasOwnProperty(p)) return false;
      switch(typeof(obj1[p])) {
        case 'object':
          if(!eqauls(obj1[p],obj2[p])) return false;
          break;
        case 'function':
          if(typeof(obj2[p]) == undefined || (p != eqauls && obj1[p].toString() != obj2[p].toString())) return false;
          break;
        default:
          if(obj1[p] != obj2[p]) return false;
      }
    }
    for(var p in obj2) {
      if(typeof(obj1[p]) == undefined) return false;
    }
    return true;
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
      } else if($('.ordo_feedback_mode').length > 0) {
        return;
      } else {
        $(".make-ordo-solution").remove();
        currCell = newCell;
        if(currCell.cell_type == "code") {
          if(currCell.output_area.outputs.length > 0){
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
  var allOutputsButton = function() {
    var myFunc = function () {
      cells = jupyter.notebook.get_cells();
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
    var full_action_name = jupyter.actions.register(action, action_name,prefix);
    if($("[data-jupyter-action*='allOutputsButton']").length == 0) {
      jupyter.toolbar.add_buttons_group([full_action_name]);
    }
  }
  var ordoEditFeedbackToggle = function() {
    var editMode = function() {
      $('.command_mode').removeClass('ordo_feedback_mode');
      $('.command_mode').addClass('ordo_edit_mode');
      $("[data-jupyter-action*='feedbackToggle']").removeClass('active');
      $("[data-jupyter-action*='editModeToggle']").addClass('active');
      makeOutputButton();
      allOutputsButton();
    };
    var eMaction = {
      icon: 'fa-pencil',
      help: 'Enter ordo-edit mode',
      help_index: 'zy',
      handler: editMode
    };
    var eMprefix = 'editModeToggle';
    var eMaction_name = 'EnterEditMode';
    var eM_action_name = jupyter.actions.register(eMaction, eMaction_name, eMprefix);
    var feedbackMode = function() {
      $('.command_mode').removeClass('ordo_edit_mode');
      $('.command_mode').addClass('ordo_feedback_mode');
      $("[data-jupyter-action*='editModeToggle']").removeClass('active');
      $("[data-jupyter-action*='feedbackToggle']").addClass('active');
      $("[data-jupyter-action*='allOutputsButton']").remove();
    };
    var fMaction = {
      icon: 'fa-check',
      help: 'Enter feedback-only mode',
      help_index: 'zx',
      handler: feedbackMode
    };
    var fMprefix = 'feedbackToggle';
    var fMaction_name = 'EnterFeedbackMode';
    var fM_action_name = jupyter.actions.register(fMaction, fMaction_name, fMprefix);
    jupyter.toolbar.add_buttons_group([fM_action_name,eM_action_name])
    $('.command_mode').addClass('ordo_feedback_mode');
    $("[data-jupyter-action*='feedbackToggle']").addClass('active');
  }
  var addSolutionButton = function() {
    output_types = [
      'application/javascript',
      'text/html',
      'text/markdown',
      'text/latex',
      'image/svg+xml',
      'image/png',
      'image/jpeg',
      'application/pdf',
      'text/plain'
    ];
    var currCell = undefined;
    events.on('select.Cell', function(event, data) {
      newCell = data.cell;
      if(newCell == currCell){
        return;
      } else if($('.ordo_feedback_mode').length > 0) {
        return;
      } else {
        $(".ordo-user-input").remove();
        currCell = newCell;
        if(currCell.cell_type == "code") {
          $(".selected > .output_wrapper .output").append(
            "<div class='btn-group col-sm-offset-4 ordo-user-input' role='group' aria-label='author input values'>" +
              "<button type='button' class='btn btn-default ordo-add-solution'>add solution</button>" +
              "<button type='button' class='btn btn-default ordo-add-success-msg'>add success response</button>" +
              "<button type='button' class='btn btn-default ordo-add-failure-msg'>add failure response</button>" +
            "</div>"
          );
          $(".ordo-add-solution").on("click", function() {
            $(".ordo-user-input").remove();
            $(".selected > .output_wrapper .output").append(
              "<div class='col-sm-6 col-sm-offset-3 ordo-user-input'>" +
                "<div class='input-group'>" +
                  "<div class='input-group-btn'>" +
                    "<button type='button' class='btn btn-default dropdown-toggle' data-toggle='dropdown'>" +
                      "text/plain" +
                    "</button>" +
                  "</div>" +
                  "<input type='text' class='form-control' placeholder='Insert solution here!'>" +
                "</div>" +
              "</div>"
            );
            //currCell.metadata.ordo_solution = {
            //  "text/plain": i
            //};
            //console.log("adding metadata");
          });
        }
      }
    }); 
  }
  var allFuncs = function() {
    feedback();
    makeOutputButton();
    addSolutionButton();
    ordoEditFeedbackToggle();
  }
  return {
    load_ipython_extension: allFuncs
  }
});
