_ = require 'underscore'
Backbone = require 'backbone'
jQuery = require 'jquery'
$ = jQuery
$survey = require './model.survey'
$modelUtils = require './model.utils'
$viewTemplates = require './view.templates'
$surveyDetailView = require './view.surveyDetails'
$viewRowSelector = require './view.rowSelector'
$rowView = require './view.row'
$baseView = require './view.pluggedIn.backboneView'
$viewUtils = require './view.utils'
_t = require('utils').t
alertify = require 'alertifyjs'

module.exports = do ->
  surveyApp = {}

  _notifyIfRowsOutOfOrder = do ->
    # a temporary function to notify devs if rows are mysteriously falling out of order
    fn = (surveyApp)->
      survey = surveyApp.survey
      elIds = []
      surveyApp.$('.survey__row').each -> elIds.push $(@).data('rowId')

      rIds = []
      gatherId = (r)->
        rIds.push(r.cid)
      survey.forEachRow(gatherId, includeGroups: true)

      _s = (i)-> JSON.stringify(i)
      if _s(rIds) isnt _s(elIds)
        Raven?.captureException new Error('Row model does not match view'), extra:
          rIds: _s(rIds)
          elIds: _s(elIds)

        false
      else
        true
    _.debounce(fn, 2500)


  class SurveyFragmentApp extends $baseView
    className: "formbuilder-wrap container"
    features: {}
    events:
      "click .js-delete-row": "clickRemoveRow"
      "click .js-delete-group": "clickDeleteGroup"
      "click .js-add-to-question-library": "clickAddRowToQuestionLibrary"
      "click .js-add-group-to-library": "clickAddGroupToLibrary"
      "click .js-clone-question": "clickCloneQuestion"
      "click .js-clone-group": "clickCloneGroup"
      "click #xlf-preview": "previewButtonClick"
      "click #csv-preview": "previewCsv"
      "click #xlf-download": "downloadButtonClick"
      "click #save": "saveButtonClick"
      "click #publish": "publishButtonClick"
      "update-sort": "updateSort"
      "click .js-select-row": "selectRow"
      "click .js-select-row--force": "forceSelectRow"
      "click .js-toggle-card-settings": "toggleCardSettings"
      "click .js-toggle-group-expansion": "toggleGroupExpansion"
      "click .js-toggle-row-multioptions": "toggleRowMultioptions"
      "click .js-close-warning": "closeWarningBox"
      "click .js-expand-row-selector": "expandRowSelector"
      "click .rowselector_toggle-library": "toggleLibrary"
      "mouseenter .card__buttons__button": "buttonHoverIn"
      "mouseleave .card__buttons__button": "buttonHoverOut"
      "click .card__settings__tabs li": "switchTab"

    @create: (params = {}) ->
      if _.isString params.el
        params.el = $(params.el).get 0
      return new @(params)

    switchTab: (event) ->
      $et = $(event.currentTarget)
      if $et.hasClass("heading")
        event.preventDefault()
        return

      tabId = $et.data('cardSettingsTabId')

      $et.parent('ul').find('.card__settings__tabs__tab--active').removeClass('card__settings__tabs__tab--active')
      $et.addClass('card__settings__tabs__tab--active')

      $et.parents('.card__settings').find(".card__settings__fields--active").removeClass('card__settings__fields--active')
      $et.parents('.card__settings').find(".card__settings__fields--#{tabId}").addClass('card__settings__fields--active')

    surveyRowSortableStop: (evt)->
      @survey.trigger('change')

      $et = $(evt.target)
      cid = $et.data('rowId')

      survey_findRowByCid = (cid)=>
        if cid
          @survey.findRowByCid(cid, includeGroups: true)

      row = survey_findRowByCid(cid)
      [_prev, _par] = @_getRelatedElIds($et)
      @survey._insertRowInPlace row,
        previous: survey_findRowByCid _prev
        parent: survey_findRowByCid _par
        event: 'sort'
      return

    _getRelatedElIds: ($el)->
      prev = $el.prev('.survey__row').eq(0).data('rowId')
      parent = $el.parents('.survey__row').eq(0).data('rowId')
      [prev, parent]

    initialize: (options)->
      @reset = ()=>
        clearTimeout(@_timedReset)  if @_timedReset
        promise = $.Deferred();
        @_timedReset = setTimeout =>
          @_reset.call(@)
          promise.resolve()
        , 0

        promise

      if options.survey and (options.survey instanceof $survey.Survey)
        @survey = options.survey
      else
        @survey = new $survey.Survey(options)

      @warnings = options.warnings || []
      @__rowViews = new Backbone.Model()
      @ngScope = options.ngScope
      @surveyStateStore = options.stateStore || {trigger:$.noop, setState:$.noop}

      $(document).on 'click', @deselect_rows

      @survey.settings.on 'change:form_id', (model, value) =>
        $('.form-id').text(value)
      @survey.on 'rows-add', @reset, @
      @survey.on 'rows-remove', @reset, @
      @survey.on "row-detail-change", (row, key, val, ctxt)=>
        if key.match(/^\$/)
          return
        evtCode = $viewUtils.normalizeEventName("row-detail-change-#{key}")
        @$(".on-#{evtCode}").trigger(evtCode, row, key, val, ctxt)
      @$el.on "choice-list-update", (evt, clId) =>
        $(".on-choice-list-update[data-choice-list-cid='#{clId}']").trigger("rebuild-choice-list")
        @survey.trigger 'choice-list-update', clId

      @$el.on "survey__row-sortablestop", _.bind @surveyRowSortableStop, @

      @onPublish = options.publish || $.noop
      @onSave = options.save || $.noop
      @onPreview = options.preview || $.noop

      @sortCancelled = false

      @expand_all_multioptions = () -> @$('.survey__row:not(.survey__row--deleted) .card--expandedchoices:visible').length > 0

      $(window).on "keydown", (evt)=>
        @onEscapeKeydown(evt) if evt.keyCode is 27

      @isAlertifyDialogShown = false

    getView: (cid)->
      @__rowViews.get(cid)

    updateSort: (evt, model, position)->
      # inspired by this:
      # http://stackoverflow.com/questions/10147969/saving-jquery-ui-sortables-order-to-backbone-js-collection
      @survey.rows.remove(model)
      @survey.rows.each (m, index)->
        m.ordinal = if index >= position then (index + 1) else index
      model.ordinal = position
      @survey.rows.add(model, at: position)
      return

    forceSelectRow: (evt)->
      # forceSelectRow is used to mock the multiple-select key
      @selectRow($.extend({}, evt))

    deselect_all_rows: () ->
      @$('.survey__row').removeClass('survey__row--selected')
      @activateGroupButton(false)
      return

    deselect_rows: (evt) =>
      # clicking on survey__row is aleady handled, so we ignore it - we only want
      # to deselet rows when clicking elsewhere
      $etp = $(evt.target).parents('.survey__row')
      if !!$etp.length
        return
      else
        @deselect_all_rows()
      return

    selectRow: (evt)->
      $et = $(evt.target)
      if $et.hasClass('js-blur-on-select-row') || $et.hasClass('editable-wrapper')
        return
      $ect = $(evt.currentTarget)
      if $et.closest('.card__settings, .card__buttons, .group__header__buttons, .js-cancel-select-row').length > 0
        return
      # a way to ensure the event is not run twice when in nested .js-select-row elements
      _isIntendedTarget = $ect.closest('.survey__row').get(0) is $et.closest('.survey__row').get(0)
      if _isIntendedTarget
        $target = $et.closest('.survey__row')
        if !(evt.ctrlKey || evt.metaKey)
          selected_rows = $target.siblings('.survey__row--selected')
          if !$target.hasClass('survey__row--selected') || selected_rows.length > 1
            @deselect_all_rows()

        $target.toggleClass("survey__row--selected")
        if $target.hasClass('survey__row--group')
          $target.find('li.survey__row, li.survey__row--group').toggleClass("survey__row--selected", $target.hasClass("survey__row--selected"))

        $group = $target.parent().closest('.survey__row')
        if $group.length > 0
          @select_group_if_all_items_selected($group)

        @questionSelect()
        @$('.js-blur-on-select-row').blur()
      return

    select_group_if_all_items_selected: ($group) ->
      $rows = $group.find('.survey__row')
      $group.toggleClass('survey__row--selected', $rows.length == $rows.filter('.survey__row--selected').length)
      $group = $group.parent().closest('.survey__row')
      if $group.length > 0
        @select_group_if_all_items_selected($group)

    questionSelect: () ->
      @activateGroupButton(@$el.find('.survey__row--selected').length > 0)
      return

    activateGroupButton: (active) ->
      @surveyStateStore.setState({groupButtonIsActive: active})
      $('.formBuilder-header__button--group').attr('disabled', !active)
      return

    getApp: -> @

    _getViewForTarget: (evt)->
      $et = $(evt.currentTarget)
      modelId = $et.closest('.survey__row').data('row-id')
      view = @__rowViews.get(modelId)
      throw new Error("view is not found for target element")  unless view
      view

    toggleCardSettings: (evt)->
      @_getViewForTarget(evt).toggleSettings()

    toggleGroupExpansion: (evt)->
      view = @_getViewForTarget(evt)
      groupsAreShrunk = view.$el.hasClass('group--shrunk')
      @surveyStateStore.setState({
          groupShrunk: groupsAreShrunk
        })
      $et = $(evt.currentTarget)
      $et.toggleClass('fa-caret-right')
      $et.toggleClass('fa-caret-down')

      view.$el.toggleClass('group--shrunk', !groupsAreShrunk)


    toggleRowMultioptions: (evt)->
      view = @_getViewForTarget(evt)
      view.toggleMultioptions()

    expandRowSelector: (evt)->
      $ect = $(evt.currentTarget)
      if $ect.parents('.survey-editor__null-top-row').length > 0
        # This is the initial row in the survey
        @null_top_row_view_selector.expand()
      else
        $row = $ect.parents('.survey__row').eq(0)
        $spacer = $ect.parents('.survey__row__spacer')
        rowId = $row.data('rowId')
        view = @getViewForRow(cid: rowId)
        if !view
          # hopefully, this error is never triggered
          throw new Error('View for row was not found: ' + rowId)

        new $viewRowSelector.RowSelector(el: $spacer.get(0), ngScope: @ngScope, spawnedFromView: view, surveyView: @, reversible:true, survey: @survey).expand()

    _render_html: ->
      @$el.html $viewTemplates.$$render('surveyApp', @)

      ###
      @$settings =
        form_id: @$('.form__settings__field--form_id')
        version: @$('.form__settings__field--version')
        style: @$('.form__settings__field--style')

      @$settings.form_id.find('input').val(@survey.settings.get('form_id'))
      @$settings.version.find('input').val(@survey.settings.get('version'))

      _style_val = @survey.settings.get('style') || ""

      if @$settings.style.find('select option')
          .filter(((i, opt)-> opt.value is _style_val)).length is 0
        # user has specified a style other than the available styles
        _inp = $("<input>", {type: 'text'})
        @$settings.style.find('select').replaceWith(_inp)
        _inp.val(_style_val)
      else
        @$settings.style.find('select').val(_style_val)
      ###

      @formEditorEl = @$(".-form-editor")
      @settingsBox = @$(".form__settings-meta__questions")

    _render_attachEvents: ->
      @survey.settings.on 'validated:invalid', (model, validations) ->
        for key, value of validations
            break

      $inps = {}
      _settings = @survey.settings

      ###
      if @$settings.form_id.length > 0
        $inps.form_id = @$settings.form_id.find('input').eq(0)
        $inps.form_id.change (evt)->
          _val = $inps.form_id.val()
          _sluggified = $modelUtils.sluggify(_val)
          _settings.set('form_id', _sluggified)
          if _sluggified isnt _val
            $inps.form_id.val(_sluggified)

      if @$settings.version.length > 0
        $inps.version = @$settings.version.find('input').eq(0)
        $inps.version.change (evt)->
          _settings.set('version', $inps.version.val())

      if @$settings.style.length > 0
        $inps.style = @$settings.style.find('input,select').eq(0)
        $inps.style.change (evt)->
          _settings.set('style', $inps.style.val())
      ###

    _render_addSubViews: ->
      meta_view = new $viewUtils.ViewComposer()

      for detail in @survey.surveyDetails.models
        if detail.get('name') in ["start", "end", "today", "deviceid"]
          meta_view.add new $surveyDetailView.SurveyDetailView(model: detail, selector: '.settings__first-meta')
        else
          meta_view.add new $surveyDetailView.SurveyDetailView(model: detail, selector: '.settings__second-meta')

      meta_view.render()
      meta_view.attach_to @settingsBox

      # in which cases is the null_top_row_view_selector viewed
      @null_top_row_view_selector = new $viewRowSelector.RowSelector(el: @$el.find(".survey__row__spacer").get(0), survey: @survey, ngScope: @ngScope, surveyView: @, reversible:true)

    _render_hideConditionallyDisplayedContent: ->
      if !@features.multipleQuestions
        @$el.addClass('survey-editor--singlequestion')
        @$el.find(".survey-editor__null-top-row").addClass("survey-editor__null-top-row--hidden")
        @$el.find(".js-expand-row-selector").addClass("btn--hidden")
        if @survey.rows.length is 0
          @null_top_row_view_selector.expand()

      if !@features.copyToLibrary
        @$el.find('.js-add-to-question-library').hide()

    render: ()->
      @$el.addClass("survey-editor--loading")
      @$el.removeClass("content--centered").removeClass("content")

      try
        @_render_html()
        @_render_attachEvents()
        @_render_addSubViews()
        @_reset()

        @_render_hideConditionallyDisplayedContent()

      catch error
        @$el.addClass("survey-editor--error")
        throw error

      @$el.removeClass("survey-editor--loading")
      @

    expandMultioptions: ->
      if @expand_all_multioptions()
        @$(".card--expandedchoices").each (i, el)=>
          @_getViewForTarget(currentTarget: el).hideMultioptions()
          ``
        _expanded = false
      else
        @$(".card--selectquestion").each (i, el)=>
          @_getViewForTarget(currentTarget: el).showMultioptions()
          ``
        _expanded = true

      @surveyStateStore.trigger({
          multioptionsExpanded: _expanded
        })
      return

    closeWarningBox: (evt)->
      @$('.survey-warnings').hide()

    getItemPosition: (item) ->
      i = 0
      while item.length > 0
        item = item.prev()
        i++

      return i

    cancelSortable: (ui) ->
      sortable_elements = ui.item.data('sortable_elements')
      ui.item.data('sortable_elements', null)
      @formEditorEl.sortable 'cancel'
      group_rows = @formEditorEl.find('.group__rows')
      if group_rows? and group_rows.length > 0
        group_rows.each (index) =>
          $(group_rows[index]).sortable 'cancel'
      
      if ui.item.hasClass('survey__row--group')
        ui.item.find('.survey__row--selected.hidden').removeClass('hidden')

      if (ui.item.data('is_multi_select')) and (sortable_elements? and sortable_elements.length > 1)
        for el in sortable_elements
          row_id = $(el).attr('data-row-id')
          if row_id != ui.item.attr('data-row-id')
            $row = $("li.survey__row--selected.hidden[data-row-id='#{row_id}']")
            $row.removeClass('hidden')
            $row.find('.survey__row--selected.hidden').removeClass('hidden')

    activateSortable: ->
      $el = @formEditorEl
      survey = @survey

      sortable_activate_deactivate = (evt, ui)=>
        isActivateEvt = evt.type is 'sortactivate'
        ui.item.toggleClass 'sortable-active', isActivateEvt
        $el.toggleClass 'insort', isActivateEvt

        @survey.trigger evt.type

      sortable_activate_check_esc = (ui) =>
        @sortCancelled = false
        @onEscapeKeydown = () =>
          @sortCancelled = true
          @cancelSortable(ui)


      sortable_stop = (evt, ui) =>
        if not @sortCancelled
          elements = ui.item.data('sortable_elements')
          elements_array = _.toArray(elements)
          elements_before = []
          elements_after = []
          itemElementsIndex = elements_array.findIndex (el) => $(el).attr('data-row-id') == ui.item.attr('data-row-id')
          if itemElementsIndex > -1
            elements_before = elements_array.slice(0, itemElementsIndex).map((el) => @__rowViews.get($(el).attr('data-row-id')).$el)
            elements_after = elements_array.slice(itemElementsIndex + 1).map((el) => @__rowViews.get($(el).attr('data-row-id')).$el)
          if elements_before.length > 0
            ui.item.before(elements_before)
          if elements_after.length > 0
            ui.item.after(elements_after)
          ui.item.closest('.survey-editor__list').find('.survey__row--selected.hidden').removeClass('hidden')
          if elements? and elements.length > 0
            for el in elements
              row_id = $(el).attr('data-row-id')
              $row = $("li.survey__row--selected:not('.hidden')[data-row-id='#{row_id}']")
              $row.trigger('survey__row-sortablestop')
          @survey.trigger 'sortablestop'
          if not ui.item.data('is_multi_select')
            ui.item.closest('.survey-editor__list').find('.survey__row--selected').removeClass('survey__row--selected')

      sortable_helper = (evt, item) =>
        item.data('is_multi_select', true)
        if not item.hasClass('survey__row--selected')
          item.closest('.survey-editor__list').find('.survey__row--selected').removeClass('survey__row--selected')
          item.addClass('survey__row--selected')
          item.data('is_multi_select', false)
        selected_elements = item.closest('.survey-editor__list').find('.survey__row--selected:not(".hidden")').clone()
        selected_row_ids = _.map(selected_elements, (el) => $(el).attr('data-row-id'))
        selected_in_group_row_ids = []
        for el in selected_elements
          row_id = $(el).attr('data-row-id')
          $row = $("li[data-row-id='#{row_id}']")
          if $row.attr('data-row-id') != item.attr('data-row-id')
            $row.addClass("hidden")
          parent_row_id = $row.parents('.survey__row--group').attr('data-row-id')
          selected_in_group_row_ids.push(row_id) if parent_row_id in selected_row_ids
        selected_elements = _.filter(selected_elements, (el) => $(el).attr('data-row-id') not in selected_in_group_row_ids)
        item.data('sortable_elements', selected_elements)
        helper = $('<ul/>')
        helper.append item.data('sortable_elements')
        helper

      @formEditorEl.sortable({
          # PM: commented out axis, because it's better if cards move horizontally and vertically
          # axis: "y"
          cancel: "button, .btn--addrow, .well, ul.list-view, li.editor-message, .editableform, .row-extras, .js-cancel-sort"
          cursor: "move"
          distance: 5
          items: "> li"
          placeholder: "placeholder"
          connectWith: ".group__rows"
          opacity: 0.9
          scroll: true
          stop: sortable_stop
          activate: sortable_activate_deactivate
          deactivate: sortable_activate_deactivate
          helper: sortable_helper
          change: (evt, ui) =>
            sortable_activate_check_esc(ui)
          receive: (evt, ui) =>
            if ui.sender.hasClass('group__rows')
              return
            prevItem = ui.item.prev()
            prevItemPosition = @getItemPosition(prevItem)
            if @ngScope.handleItem
              @ngScope.handleItem({
                  position: prevItemPosition - 1
                  itemData: ui.item.data()
                })
            else
              @ngScope.add_item @getItemPosition(prevItem) - 1
            ui.sender.sortable('cancel')
        })
      group_rows = @formEditorEl.find('.group__rows')
      group_rows.each (index) =>
        $(group_rows[index]).sortable({
          cancel: 'button, .btn--addrow, .well, ul.list-view, li.editor-message, .editableform, .row-extras, .js-cancel-sort, .js-cancel-group-sort' + index
          cursor: "move"
          distance: 5
          items: "> li"
          placeholder: "placeholder"
          connectWith: ".group__rows, .survey-editor__list"
          opacity: 0.9
          scroll: true
          stop: sortable_stop
          activate: sortable_activate_deactivate
          deactivate: sortable_activate_deactivate
          helper: sortable_helper
          change: (evt, ui) =>
            sortable_activate_check_esc(ui)
          receive: (evt, ui) =>
            if ui.sender.hasClass('group__rows') || ui.sender.hasClass('survey-editor__list')
              return
            prevItem = ui.item.prev()
            if @ngScope.handleItem
              uiItemParentWithId = $(ui.item).parents('[data-row-id]')[0]
              if uiItemParentWithId
                groupId = uiItemParentWithId.dataset.rowId
              @ngScope.handleItem({
                  position: @getItemPosition(prevItem),
                  itemData: ui.item.data(),
                  groupId: groupId
                })
            else
              @ngScope.add_item(@getItemPosition(prevItem))
            ui.sender.sortable('cancel')
        })
        $(@).attr('data-sortable-index', index)

      group_rows.find('.survey__row').each @_preventSortableIfGroupTooSmall

      return
    _preventSortableIfGroupTooSmall: (index, element)->
      $element = $(element)
      class_name_matches = element.className.match(/js-cancel-group-sort\d+/g)
      if class_name_matches?
        $element.removeClass class_name_matches.join(' ')
      if $element.siblings('.survey__row').length is 0
        $element.addClass('js-cancel-group-sort' + ($element.closest('.group__rows').attr('data-sortable-index')))

    validateSurvey: ()->
      if !@features.multipleQuestions
        return @survey.rows.length == 1

      return @survey._validate()

    previewCsv: ->
      scsv = @survey.toCSV()
      console?.clear()
      log scsv
      return

    ensureElInView: (row, parentView, $parentEl)->
      view = @getViewForRow(row)
      $el = view.$el
      index = row._parent.indexOf(row)

      if index > 0
        prevRow = row._parent.at(index - 1)
      if prevRow
        prevRowEl = $parentEl.find(".survey__row[data-row-id=#{prevRow.cid}]")

      requiresInsertion = false
      detachRowEl = (detach)->
        $el.detach()
        requiresInsertion = true

      # trying to avoid unnecessary reordering of DOM (very slow)
      if $el.parents($parentEl).length is 0
        detachRowEl()
      else if $el.parent().get(0) isnt $parentEl.get(0)
        # element does not have the correct parent
        detachRowEl()
      else if !prevRow
        if $el.prev('.survey__row').not('.survey__row--deleted').data('rowId')
          detachRowEl()
      else if $el.prev('.survey__row').not('.survey__row--deleted').data('rowId') isnt prevRow.cid
        # element is in the wrong location
        detachRowEl()

      if requiresInsertion
        if prevRow
          $el.insertAfter(prevRowEl)
        else
          $el.appendTo($parentEl)
      view

    getViewForRow: (row)->
      unless (xlfrv = @__rowViews.get(row.cid))
        if row.getValue('type') is 'kobomatrix'
          rv = new $rowView.KoboMatrixView(model: row, ngScope: @ngScope, surveyView: @)
        else if row.constructor.kls is 'Group'
          rv = new $rowView.GroupView(model: row, ngScope: @ngScope, surveyView: @)
        else if row.get('type').getValue() is 'score'
          rv = new $rowView.ScoreView(model: row, ngScope: @ngScope, surveyView: @)
        else if row.get('type').getValue() is 'rank'
          rv = new $rowView.RankView(model: row, ngScope: @ngScope, surveyView: @)
        else
          rv = new $rowView.RowView(model: row, ngScope: @ngScope, surveyView: @)
        @__rowViews.set(row.cid, rv)
        xlfrv = @__rowViews.get(row.cid)
      xlfrv

    _reset: ->
      _notifyIfRowsOutOfOrder(@)

      isEmpty = true
      @survey.forEachRow(((row)=>
          if !@features.skipLogic
            row.unset 'relevant'
          isEmpty = false
          @ensureElInView(row, @, @formEditorEl).render()
        ), includeErrors: true, includeGroups: true, flat: true)

      null_top_row = @formEditorEl.find(".survey-editor__null-top-row").removeClass("expanded")
      null_top_row.toggleClass("survey-editor__null-top-row--hidden", !isEmpty)


      if @features.multipleQuestions
        @activateSortable()

      return

    clickDeleteGroup: (evt)->
      @_getViewForTarget(evt).deleteGroup(evt)

    clickAddRowToQuestionLibrary: (evt)->
      @_getViewForTarget(evt).add_row_to_question_library(evt)

    clickAddGroupToLibrary: (evt)->
      @_getViewForTarget(evt).add_group_to_library(evt)

    clickCloneQuestion: (evt)->
      @_getViewForTarget(evt).clone()

    clickCloneGroup: (evt)->
      $group_item = $(evt.target).closest('.survey__row--group')
      uiItemParentWithId = $group_item.parents('[data-row-id]')[0]
      if uiItemParentWithId # group in group
        groupId = uiItemParentWithId.dataset.rowId

      view = @_getViewForTarget(evt)
      viewModel = view.model
      viewParent = viewModel._parent
      view.clone(viewParent.models.indexOf(viewModel) + 1, groupId)

    clickRemoveRow: (evt)->
      evt.preventDefault()

      dialog = alertify.dialog('confirm')
      opts = 
        title: _t('Delete question')
        message: _t('Are you sure you want to delete this question?') + " " + _t("This action cannot be undone.")
        labels:
          ok: _t('Yes')
          cancel: _t('No')
        onshow: =>
          @isAlertifyDialogShown = true
          return

        onclose: =>
          @isAlertifyDialogShown = false
          $et = $(evt.target)
          $deleteButton = $et.closest('.card__buttons__button')
          $deleteButton.trigger('mouseleave')
          return

        onok: =>
          @survey.trigger('change')

          $et = $(evt.target)
          rowEl = $et.parents(".survey__row").eq(0)
          rowId = rowEl.data("rowId")

          matchingRow = false
          findMatch = (r)->
            if r.cid is rowId
              matchingRow = r
            return

          @survey.forEachRow findMatch, {
            includeGroups: false
          }

          if !matchingRow
            throw new Error("Matching row was not found.")
          
          @_deleteRow matchingRow

          return
        oncancel: =>
          dialog.destroy()
          return

      dialog.set(opts).show()

    _deleteRow: (row) ->
      $row = $("li[data-row-id='#{row.cid}']")
      parent = row._parent._parent
      row.detach()
      # this slideUp is for add/remove row animation
      $row.addClass('survey__row--deleted')
      $row.slideUp 175, "swing", ()=>
        $row.remove()
        @survey.rows.remove row
        if parent.constructor.kls == "Group" && parent.rows.length == 0
          parent_view = @__rowViews.get(parent.cid)
          if !parent_view
            Raven?.captureException("parent view is not defined", row.get('name').get('value'))
          parent_view._deleteGroup()

    deleteSelectedRows: ->
      dialog = alertify.dialog('confirm')
      rows = @selectedRows()
      opts = 
        title: _t('Delete selected questions')
        message: _t('Are you sure you want to delete these questions?') + " " + _t("This action cannot be undone.")
        labels:
          ok: _t('Yes')
          cancel: _t('No')
        onok: =>
          @survey.trigger('change')

          for row in rows
            @_deleteRow row

          return
        oncancel: =>
          dialog.destroy()
          return
      dialog.set(opts).show()

    groupSelectedRows: ->
      rows = @selectedRows()
      $q = @$('.survey__row--selected')
      $q.detach()
      $q.removeClass('survey__row--selected')
      @activateGroupButton(false)
      if rows.length > 0
        @survey._addGroup(__rows: rows)
        @reset()
        true
      else
        false

    _duplicateRows: (rows) ->
      for row, row_idx in rows
        view = @__rowViews.get(row.cid)
        viewModel = view.model
        viewParent = viewModel._parent
        if row.constructor.kls isnt "Group"  
          viewModel.getSurvey().insert_row.call viewParent._parent, viewModel, viewParent.models.indexOf(viewModel) + 1
        else # duplicate group
          $group_item = $("li[data-row-id='#{row.cid}']")
          uiItemParentWithId = $group_item.parents('[data-row-id]')[0]
          if uiItemParentWithId # group in group
            groupId = uiItemParentWithId.dataset.rowId
          view.clone(viewParent.models.indexOf(viewModel) + 1, groupId)

    duplicateSelectedRows: () ->
      rows = @selectedRows()
      rows_length = rows.length

      if rows_length > 0
        @_duplicateRows rows

    addSelectedRowsToLibrary: () ->
      rows = @selectedRows()
      @ngScope.add_rows_to_question_library(rows, @survey._initialParams)

    selectedRows: ()->
      rows = []
      @$el.find('.survey__row--selected').each (i, el)=>
        $el = $(el)
        if $el.parents('li.survey__row--group.survey__row--selected').length > 0
          return
        rowId = $el.data("rowId")
        matchingRow = false
        findMatch = (row)->
          if row.cid is rowId
            matchingRow = row
        @survey.forEachRow findMatch, includeGroups: true
        # matchingRow = @survey.rows.find (row)-> row.cid is rowId
        rows.push matchingRow
      rows

    onEscapeKeydown: -> #noop. to be overridden
    previewButtonClick: (evt)->
      if evt.shiftKey #and evt.altKey
        evt.preventDefault()
        if evt.altKey
          content = @survey.toCSV()
        else
          content = JSON.stringify(@survey.toJSON(), null, 4)
        $viewUtils.debugFrame content.replace(new RegExp(' ', 'g'), '&nbsp;')
        @onEscapeKeydown = $viewUtils.debugFrame.close
      else
        $viewUtils.enketoIframe.fromCsv @survey.toCSV(),
          previewServer: window.koboConfigs?.previewServer or "https://kf.kobotoolbox.org"
          enketoServer: window.koboConfigs?.enketoServer or false
          enketoPreviewUri: window.koboConfigs?.enketoPreviewUri or false
          onSuccess: => @onEscapeKeydown = $viewUtils.enketoIframe.close
          onError: (message)=> alertify.error(message)
      return
    downloadButtonClick: (evt)->
      # Download = save a CSV file to the disk
      surveyCsv = @survey.toCSV()
      if surveyCsv
        evt.target.href = "data:text/csv;charset=utf-8,#{encodeURIComponent(@survey.toCSV())}"
    saveButtonClick: (evt)->
      # Save = store CSV in local storage.
      icon = $(evt.currentTarget).find('i')
      icon.addClass 'fa-spinner fa-spin blue'
      icon.removeClass 'fa-check-circle green'
      @onSave.apply(@, arguments).finally () ->
        icon.removeClass 'fa-spinner fa-spin blue'
        icon.addClass 'fa-check-circle green'

    publishButtonClick: (evt)->
      # Publish = trigger publish action (ie. post to formhub)
      @onPublish.apply(@, arguments)
    toggleLibrary: (evt)->
      evt.stopPropagation()
      $et = $(evt.target)
      $et.toggleClass('active__sidebar')
      $("section.form-builder").toggleClass('active__sidebar')
      @ngScope.displayQlib = !@ngScope.displayQlib
      @ngScope.$apply()

      $("section.koboform__questionlibrary").toggleClass('active').data("rowIndex", -1)
      return
    buttonHoverIn: (evt)->
      evt.stopPropagation()
      $et = $(evt.currentTarget)
      buttonName = $et.data('buttonName')
      $et.closest('.card').addClass('card--shaded')
      $header = $et.closest('.card__header')
      card_hover_text = do ->
        if buttonName is 'settings'
          _t("[button triggers] Settings")
        else if buttonName is 'delete'
          _t("[button triggers] Delete Question")
        else if buttonName is 'duplicate'
          _t("[button triggers] Duplicate Question")
        else if buttonName is 'add-to-library'
          _t("[button triggers] Add Question to Library")

      $header.find('.card__header--shade').eq(0).children('span').eq(0)
        .attr('data-card-hover-text', card_hover_text)
      $header.addClass(buttonName)
      return
    buttonHoverOut: (evt)->
      evt.stopPropagation()
      if @isAlertifyDialogShown
        return
      $et = $(evt.currentTarget)
      buttonName = $et.data('buttonName')
      $et.closest('.card__header').removeClass(buttonName)
      $et.closest('.card').removeClass('card--shaded')
      return

  class surveyApp.SurveyApp extends SurveyFragmentApp
    features:
      multipleQuestions: true
      skipLogic: true
      copyToLibrary: true

  class surveyApp.QuestionApp extends SurveyFragmentApp
    features:
      multipleQuestions: false
      skipLogic: false
      copyToLibrary: false
    render: () ->
      super
      @$('.survey-editor.form-editor-wrap.container').append $('.question__tags')

  class surveyApp.SurveyTemplateApp extends $baseView
    events:
      "click .js-start-survey": "startSurvey"
    initialize: (@options)->
    render: ()->
      @$el.addClass("content--centered").addClass("content")
      @$el.html $viewTemplates.$$render('surveyTemplateApp')
      @
    startSurvey: ->
      new surveyApp.SurveyApp(@options).render()

  surveyApp
