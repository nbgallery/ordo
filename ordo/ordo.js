define([
  'jquery',
  'base/js/namespace',
  'base/js/events',
  'base/js/dialog'
],  function(
  $,
  Jupyter,
  events,
  dialog
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
  var ordoFeedback = function () {
    events.on('output_appended.OutputArea', function(event,type,result,md,html) {
      events.on('finished_execute.CodeCell', function(evt, obj){
        solution = obj.cell.metadata.ordo_solution;
        if (solution != undefined) {
          if (html.parent().parent().children().toArray().length == 1) {
            if(obj.cell.metadata.ordo_verify == undefined) {
              feedback = ordoFeedbackMessage(eqauls(solution,obj.cell.output_area.outputs[0].data), obj.cell.metadata.ordo_success, obj.cell.metadata.ordo_failure);
            } else {
              feedback = obj.cell.metadata.ordo_verify(obj.cell.output_area.outputs[0].data, obj.cell.metadata.ordo_success, obj.cell.metadata.ordo_failure);
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
  var ordoFeedbackMessage =  function(correct,success_msg,failure_msg) {
    if(correct) {
      if (success_msg == undefined) {
        feedback = "<div class='alert alert-success alert-dismissible ordo_feedback' role='alert'><button type='button' class='close' data-dismiss='alert'>&times;</button><strong>Well Done!</strong> That was the correct response.</div>"
      } else {
        feedback = "<div class='alert alert-success alert-dismissible ordo_feedback' role='alert'><button type='button' class='close' data-dismiss='alert'>&times;</button>" + success_msg  + "</div>"
      }
    } else {
      if (failure_msg == undefined) {
        feedback = "<div class='alert alert-danger alert-dismissible ordo_feedback' role='alert'><button type='button' class='close' data-dismiss='alert'>&times;</button><strong>Oh no!</strong> That wasn't quite right.</div>"
      } else {
        feedback = "<div class='alert alert-danger alert-dismissible ordo_feedback' role='alert'><button type='button' class='close' data-dismiss='alert'>&times;</button>" + failure_msg  + "</div>"
      }
    }
    return feedback;
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
      } else if($('.ordo_edit_mode').length == 0) {
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
      cells = Jupyter.notebook.get_cells();
      for(i=0;i < cells.length;i++) {
        if(cells[i].cell_type == "code") {
          if(cells[i].output_area != undefined) {
            if(cells[i].output_area.outputs.length > 0) {
              if(cells[i].output_area.outputs[0].output_type == "execute_result") {
                cells[i].metadata.ordo_solution = cells[i].output_area.outputs[0].data
                console.log("updated metadata");
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
    if($("[data-jupyter-action*='allOutputsButton']").length == 0) {
      Jupyter.toolbar.add_buttons_group([full_action_name]);
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
    var eM_action_name = Jupyter.actions.register(eMaction, eMaction_name, eMprefix);

    var feedbackMode = function() {
      $('.command_mode').removeClass('ordo_edit_mode');
      $('.command_mode').addClass('ordo_feedback_mode');
      $("[data-jupyter-action*='editModeToggle']").removeClass('active');
      $("[data-jupyter-action*='feedbackToggle']").addClass('active');
      $("[data-jupyter-action*='allOutputsButton']").remove();
      $(".make-ordo-solution").remove();
      $(".ordo-user-input").remove();
    };
    var fMaction = {
      icon: 'fa-check',
      help: 'Enter feedback-only mode',
      help_index: 'zx',
      handler: feedbackMode
    };
    var fMprefix = 'feedbackToggle';
    var fMaction_name = 'EnterFeedbackMode';
    var fM_action_name = Jupyter.actions.register(fMaction, fMaction_name, fMprefix);
    Jupyter.toolbar.add_buttons_group([fM_action_name,eM_action_name])
    $('.command_mode').addClass('ordo_feedback_mode');
    $("[data-jupyter-action*='feedbackToggle']").addClass('active');
  }
  var editMetadataButtons = function() {
    var currCell = undefined;
    events.on('select.Cell', function(event, data) {
      newCell = data.cell;
      if(newCell == currCell){
        return;
      } else if($('.ordo_edit_mode').length == 0) {
        return;
      } else {
        $(".ordo-user-input").remove();
        currCell = newCell;
        if(currCell.cell_type == "code") {
          $(".selected > .output_wrapper .output").append(ordoEditButtons);
          $(".ordo-add-solution").on('click', function(event) {
            dialog.modal({
              'title': 'Add Solution',
              'body': makeSolutionInputArea(),
              'buttons': {
                'Cancel': {},
                'Save New Solution': {
                  'id': 'save-solution-btn',
                  'class': 'btn-primary',
                  'click': function() {
                    sol = {}
                    sol[$('#output_type').val()] = $('#solution_text_area').val()
                    Jupyter.notebook.get_selected_cell().metadata.ordo_solution = sol
                  }
                },
              },
              'keyboard_manager': Jupyter.notebook.keyboard_manager,
              'notebook': Jupyter.notebook
            })
          });
          $(".ordo-add-success-msg").on('click', function(event) {
            dialog.modal({
              'title': 'Add Success Message',
              'body': makeMessageInputArea(),
              'buttons': {
                'Cancel': {},
                'Save New Message': {
                  'id': 'save-success-msg-btn',
                  'class': 'btn-primary',
                  'click': function() {
                    if($('#styling').val() == "bold") {
                      sol = "<b>" + $('#message_text_area').val() + "</b>"
                    } else {
                      sol = $('#message_text_area').val() 
                    }
                    Jupyter.notebook.get_selected_cell().metadata.ordo_success = sol
                  }
                },
              },
              'keyboard_manager': Jupyter.notebook.keyboard_manager,
              'notebook': Jupyter.notebook
            })
          });
          $(".ordo-add-failure-msg").on('click', function(event) {
            dialog.modal({
              'title': 'Add Failure Message',
              'body': makeMessageInputArea(),
              'buttons': {
                'Cancel': {},
                'Save New Message': {
                  'id': 'save-failure-msg-btn',
                  'class': 'btn-primary',
                  'click': function() {
                    if($('#styling').val() == "bold") {
                      sol = "<b>" + $('#message_text_area').val() + "</b>"
                    } else {
                      sol = $('#message_text_area').val() 
                    }
                    Jupyter.notebook.get_selected_cell().metadata.ordo_failure = sol
                  }
                },
              },
              'keyboard_manager': Jupyter.notebook.keyboard_manager,
              'notebook': Jupyter.notebook
            })
          });
        }
      }
    }); 
  }
  var ordoEditButtons = "<div class='btn-group col-sm-offset-4 ordo-user-input' role='group' aria-label='author input values'>" +
      "<button type='button' class='btn btn-default ordo-add-solution' data-field='ordo_solution'>add solution</button>" +
      "<button type='button' class='btn btn-default ordo-add-success-msg' data-field='ordo_success'>add success response</button>" +
      "<button type='button' class='btn btn-default ordo-add-failure-msg' data-field='ordo_failure'>add failure response</button>" +
    "</div>"
  
  var makeMessageInputArea = function() {
    var styles= [
      'bold',
      'plain text',
      'html'
    ]
    
    $sel = $('<select />', {
      'class': "form-control",
      'id': "styling",
      'title': 'Select the styling for the following text'
    })
    $.each(styles, function(index, type) {
      $sel.append("<option>" + type + "</option>")
    })

    var inputArea = $('<div />', {
      'class': 'inputArea'
    }).append(
      $('<div />', {
        'title': 'Message Input Area'
      }).append(
        $('<form />', {
          'class': "form-inline"
        }).append($sel)
          .append(
            $('<textarea />', {
              'class': 'form-control',
              'id': 'message_text_area',
              'rows': '2',
              'style': 'width:70%',
              'title': 'Input text here!'
            }))
            .append(
              $('<button />', {
                'class': 'btn btn-default add-field',
                'title': 'Add another field'
              }).append(
                $('<span />', {
                  'class': 'fa fa-plus'
                })
              )
            )
          .append($('<p />', {
            'class': 'form-text text-muted',
            'text': 'When html is selected, users may format their message using html as desired.'
          }))
        )
      ) 
    return inputArea;
  }
  var makeSolutionInputArea = function() {
    var output_types = [
      'text/plain',
      'text/html',
      'text/markdown',
      'text/latex',
      'image/svg+xml',
      'image/png',
      'image/jpeg',
      'application/javascript',
      'application/pdf'
    ]
    
    $sel = $('<select />', {
      'class': "form-control solution_type",
      'id': "output_type",
      'title': 'Select the output type'
    })
    $.each(output_types, function(index, type) {
      $sel.append("<option>" + type + "</option>")
    })

    var inputArea = $('<div />', {
      'title': 'Solution Input Area'
    }).append(
      $('<form />', {
        'class': "form-inline"
      }).append($sel).append(
        $('<textarea />', {
          'class': 'form-control solution_text_area',
          'id': 'solution_text_area',
          'rows': '2',
          'style': 'width:65%',
          'title': 'Input text here!'
        })).append(
        $('<button />', {
          'class': 'btn btn-default',
          'title': 'Add another field'
        }).append(
          $('<span />', {
            'class': 'fa fa-plus'
          })
        )
      )
    )

    return inputArea;
  }

  var ordo_exts = function() {
    ordoFeedback();
    makeOutputButton();
    editMetadataButtons();
    ordoEditFeedbackToggle();
  }
  return {
    load_ipython_extension: ordo_exts
  }
});
