_ = require 'underscore'
Backbone = require 'backbone'
$modelUtils = require './model.utils'
$configs = require './model.configs'
$viewUtils = require './view.utils'
$icons = require './view.icons'
$hxl = require './view.rowDetail.hxlDict'

$viewRowDetailSkipLogic = require './view.rowDetail.SkipLogic'
$viewTemplates = require './view.templates'
_t = require('utils').t

module.exports = do ->
  viewRowDetail = {}

  class viewRowDetail.DetailView extends Backbone.View
    ###
    The DetailView class is a base class for details
    of each row of the XLForm. When the view is initialized,
    a mixin from "DetailViewMixins" is applied.
    ###
    className: "card__settings__fields__field  dt-view dt-view--depr"
    initialize: ({@rowView})->
      unless @model.key
        throw new Error "RowDetail does not have key"
      modelKey = @model.key
      if modelKey == 'bind::oc:itemgroup'
        modelKey = 'oc_item_group'
      else if modelKey == 'bind::oc:external'
        modelKey = 'oc_external'
      else if modelKey == 'bind::oc:briefdescription'
        modelKey = 'oc_briefdescription'
      else if modelKey == 'bind::oc:description'
        modelKey = 'oc_description'
      @extraClass = "xlf-dv-#{modelKey}"
      _.extend(@, viewRowDetail.DetailViewMixins[modelKey] || viewRowDetail.DetailViewMixins.default)
      Backbone.on('ocCustomEvent', @onOcCustomEvent, @)
      @$el.addClass(@extraClass)

    render: ()->
      rendered = @html()
      if rendered
        @$el.html rendered

      @afterRender && @afterRender()
      @
    html: ()->
      $viewTemplates.$$render('xlfDetailView', @)
    listenForCheckboxChange: (opts={})->
      el = opts.el || @$('input[type=checkbox]').get(0)
      $el = $(el)
      changing = false
      _requiredBox = @model.key is "required"

      reflectValueInEl = ()=>
        if !changing
          val = @model.get('value')
          if val is true or val in $configs.truthyValues
            $el.prop('checked', true)
      @model.on 'change:value', reflectValueInEl
      reflectValueInEl()
      $el.on 'change', ()=>
        changing = true
        @model.set('value', $el.prop('checked'))
        if _requiredBox
          $el.parents('.card').eq(0).toggleClass('card--required', $el.prop('checked'))
        changing = false
    listenForInputChange: (opts={})->
      # listens to checkboxes and input fields and ensures
      # the model's value is reflected in the element and changes
      # to the element are reflected in the model (with transformFn
      # applied)
      el = opts.el || @$('input').get(0)

      $el = $(el)
      transformFn = opts.transformFn || false
      inputType = opts.inputType
      inTransition = false

      changeModelValue = ($elVal)=>
        # preventing race condition
        if !inTransition
          inTransition = true
          @model.set('value', $elVal)
          reflectValueInEl(true)
          inTransition = false

      reflectValueInEl = (force=false)=>
        # This should never change the model value
        if force || !inTransition
          modelVal = @model.get('value')
          if inputType is 'checkbox'
            if !_.isBoolean(modelVal)
              modelVal = modelVal in $configs.truthyValues
            # triggers element change event
            $el.prop('checked', modelVal)
          else
            # triggers element change event
            $el.val(modelVal)

      detectAndChangeValue = () =>
        $elVal = $el.val()
        if transformFn
          $elVal = transformFn($elVal)
        changeModelValue($elVal)

      reflectValueInEl()
      @model.on 'change:value', reflectValueInEl

      $el.on 'change', ()=>
        detectAndChangeValue()

      $el.on 'blur', ()=>
        detectAndChangeValue()

      $el.on 'keyup', (evt) =>
        if evt.key is 'Enter' or evt.keyCode is 13
          $el.blur()
        else
          if not transformFn
            detectAndChangeValue()

      return

    _insertInDOM: (where, how) ->
      where[how || 'append'](@el)
    insertInDOM: (rowView)->
      @_insertInDOM rowView.defaultRowDetailParent

    makeFieldCheckCondition: (opts={}) ->
      el = opts.el || @$('input').get(0)
      $el = $(el)
      fieldClass = opts.fieldClass || 'input-error'
      message = opts.message || "This field is required"
      checkIfNotEmpty = opts.checkIfNotEmpty || false

      showMessage =() =>
        $el.closest('div').addClass(fieldClass)
        if $el.siblings('.message').length is 0
          $message = $('<div/>').addClass('message').text(_t(message))
          $el.after($message)

      hideMessage =() =>
        $el.closest('div').removeClass(fieldClass)
        $el.siblings('.message').remove()
      
      showOrHideCondition = () =>
        if checkIfNotEmpty
          if $el.val() != ''
            showMessage()
          else
            hideMessage()
        else
          if $el.val() == ''
            showMessage()
          else
            hideMessage()

      $el.on 'blur', ->
        showOrHideCondition()

      $el.on 'keyup', ->
        showOrHideCondition()

      showOrHideCondition()

    removeFieldCheckCondition: (opts={}) ->
      el = opts.el || @$('input').get(0)
      $el = $(el)
      fieldClass = opts.fieldClass || 'input-error'
      
      $el.off 'blur'
      $el.off 'keyup'
      $el.closest('div').removeClass(fieldClass)
      $el.siblings('.message').remove()

    makeRequired: (opts={}) ->
      @makeFieldCheckCondition()

    removeRequired: (opts={}) ->
      @removeFieldCheckCondition()

  viewRowDetail.Templates = {
    textbox: (cid, key, key_label = key, input_class = '', placeholder_text='', max_length = '') ->
      if placeholder_text is not ''
        placeholder_text = _t(placeholder_text)
      if max_length is ''
        @field """<input type="text" name="#{key}" id="#{cid}" class="#{input_class}" placeholder="#{placeholder_text}" />""", cid, key_label
      else
        @field """<input type="text" name="#{key}" id="#{cid}" class="#{input_class}" placeholder="#{placeholder_text}" maxlength="#{max_length}" />""", cid, key_label

    checkbox: (cid, key, key_label = key, input_label = _t("Yes")) ->
      input_label = input_label
      @field """<input type="checkbox" name="#{key}" id="#{cid}"/> <label for="#{cid}">#{input_label}</label>""", cid, key_label

    radioButton: (cid, key, options, key_label = key, default_value = '') ->
      buttons = ""
      for option in options
        buttons += """<input type="radio" name="#{key}" id="option_#{option.label}" value="#{option.value}">"""
        buttons += """<label id="label_#{option.label}" for="#{option.label}">#{option.label}</label>"""

      @field buttons, cid, key_label

    dropdown: (cid, key, values, key_label = key) ->
      select = """<select name="#{key}" id="#{cid}">"""

      for value in values
        if typeof value == 'object'
          select += """<option value="#{value.value}">#{value.text}</option>"""
        else
          select += """<option value="#{value}">#{value}</option>"""

      select += "</select>"

      @field select, cid, key_label

    hxlTags: (cid, key, key_label = key, value = '', hxlTag = '', hxlAttrs = '') ->
      tags = """<input type="text" name="#{key}" id="#{cid}" class="hxlValue hidden" value="#{value}"  />"""
      tags += """ <div class="settings__hxl"><input id="#{cid}-tag" class="hxlTag" value="#{hxlTag}" type="hidden" />"""
      tags += """ <input id="#{cid}-attrs" class="hxlAttrs" value="#{hxlAttrs}" type="hidden" /></div>"""

      @field tags, cid, key_label

    field: (input, cid, key_label) ->
      """
      <div class="card__settings__fields__field">
        <label for="#{cid}">#{key_label}:</label>
        <span class="settings__input">
          #{input}
        </span>
      </div>
      """
  }

  viewRowDetail.DetailViewMixins = {}

  viewRowDetail.DetailViewMixins.type =
    html: -> false
    insertInDOM: (rowView)->
      typeStr = @model.get("typeId")
      if !(@model._parent.constructor.kls is "Group")
        faClass = $icons.get(typeStr)?.get("faClass")
        if !faClass
          console?.error("could not find icon for type: #{typeStr}")
          faClass = "fighter-jet"
        rowView.$el.find(".card__header-icon").addClass("fa-#{faClass}")


  viewRowDetail.DetailViewMixins.label =
    html: -> false
    insertInDOM: (rowView)->
      cht = rowView.$label
      cht.value = @model.get('value')
      return @
    afterRender: ->
      @listenForInputChange({
        el: this.rowView.$label,
        transformFn: (value) ->
          value = value.replace(new RegExp(String.fromCharCode(160), 'g'), '')
          value = value.replace /\t/g, ' '
          return value
      })
      return

  viewRowDetail.DetailViewMixins.hint =
    html: -> false
    insertInDOM: (rowView) ->
      hintEl = rowView.$hint
      hintEl.value = @model.get("value")
      return @
    afterRender: ->
      @listenForInputChange({
        el: this.rowView.$hint
      })
      return

  viewRowDetail.DetailViewMixins.constraint_message =
    html: ->
      @$el.addClass("card__settings__fields--active")
      viewRowDetail.Templates.textbox @cid, @model.key, _t("Constraint Message"), 'text'
    insertInDOM: (rowView)->
      @_insertInDOM rowView.cardSettingsWrap.find('.card__settings__fields--validation-criteria').eq(0)
    afterRender: ->
      @listenForInputChange()

  # parameters are handled per case
  viewRowDetail.DetailViewMixins.parameters =
    html: -> false
    insertInDOM: (rowView)-> return

  # body::accept is handled in custom view
  viewRowDetail.DetailViewMixins['body::accept'] =
    html: -> false
    insertInDOM: (rowView)-> return

  viewRowDetail.DetailViewMixins.relevant =
    html: ->
      @$el.addClass("card__settings__fields--active")
      """
      <div class="card__settings__fields__field relevant__editor">
      </div>
      """

    afterRender: ->
      @$el.find(".relevant__editor").html("""
        <div class="skiplogic__main"></div>
        <p class="skiplogic__extras">
        </p>
      """)

      @target_element = @$('.skiplogic__main')

      @model.facade.render @target_element

    insertInDOM: (rowView) ->
      @_insertInDOM rowView.cardSettingsWrap.find('.card__settings__fields--skip-logic').eq(0)

  viewRowDetail.DetailViewMixins.constraint =
    html: ->
      @$el.addClass("card__settings__fields--active")
      """
      <div class="card__settings__fields__field constraint__editor">
      </div>
      """
    afterRender: ->
      @$el.find(".constraint__editor").html("""
        <div class="skiplogic__main"></div>
        <p class="skiplogic__extras">
        </p>
      """)

      @target_element = @$('.skiplogic__main')

      @model.facade.render @target_element

    insertInDOM: (rowView) ->
      @_insertInDOM rowView.cardSettingsWrap.find('.card__settings__fields--validation-criteria')

  viewRowDetail.DetailViewMixins.name =
    html: ->
      @fieldMaxLength = 36
      @fieldTab = "active"
      @$el.addClass("card__settings__fields--#{@fieldTab}")
      if @model._parent.constructor.key == 'group'
        viewRowDetail.Templates.textbox @cid, @model.key, _t("Layout Group Name"), 'text', 'Enter layout group name'
      else
        viewRowDetail.Templates.textbox @cid, @model.key, _t("Item Name"), 'text', 'Enter variable name', '40'
    afterRender: ->
      @listenForInputChange(transformFn: (value)=>
        value_chars = value.split('')
        if !/[\w_]/.test(value_chars[0])
          value_chars.unshift('_')

        @model.set 'value', value
        @model.deduplicate @model.getSurvey(), @fieldMaxLength
      )
      update_view = () => @$el.find('input').eq(0).val(@model.get("value") || '')
      update_view()

      @model._parent.get('label').on 'change:value', update_view
      @model.set 'value', @model.deduplicate @model.getSurvey(), @fieldMaxLength
      @makeRequired()
  # insertInDom: (rowView)->
    #   # default behavior...
    #   rowView.defaultRowDetailParent.append(@el)

  viewRowDetail.DetailViewMixins.tags =
    html: ->
      @fieldTab = "active"
      @$el.addClass("card__settings__fields--#{@fieldTab}")
      label = _t("HXL")
      if (@model.get("value"))
        tags = @model.get("value")
        hxlTag = ''
        hxlAttrs = []
        hxlAttrsString = ''

        if _.isArray(tags)
          _.map(tags, (_t, i)->
            if (_t.indexOf('hxl:') > -1)
              _t = _t.replace('hxl:','')
              if (_t.indexOf('#') > -1)
                hxlTag = _t
              if (_t.indexOf('+') > -1)
                _t = _t.replace('+','')
                hxlAttrs.push(_t)
          )

        if _.isArray(hxlAttrs)
          hxlAttrsString = hxlAttrs.join(',')

        viewRowDetail.Templates.hxlTags @cid, @model.key, label, @model.get("value"), hxlTag, hxlAttrsString
      else
        viewRowDetail.Templates.hxlTags @cid, @model.key, label
    afterRender: ->
      @$el.find('input.hxlTag').select2({
          tags:$hxl.dict,
          maximumSelectionSize: 1,
          placeholder: _t("#tag"),
          tokenSeparators: ['+',',', ':'],
          formatSelectionTooBig: _t("Only one HXL tag allowed per question. ")
          createSearchChoice: @_hxlTagCleanup
        })
      @$el.find('input.hxlAttrs').select2({
          tags:[],
          tokenSeparators: ['+',',', ':'],
          formatNoMatches: _t("Type attributes for this tag"),
          placeholder: _t("Attributes"),
          createSearchChoice: @_hxlAttrCleanup
          allowClear: 1
        })

      @$el.find('input.hxlTag').on 'change', () => @_hxlUpdate()
      @$el.find('input.hxlAttrs').on 'change', () => @_hxlUpdate()

      @$el.find('input.hxlTag').on 'select2-selecting', (e) => @_hxlTagSelecting(e)
      @$el.find('.hxlTag input.select2-input').on 'keyup', (e) => @_hxlTagSanitize(e)

      @listenForInputChange({el: @$el.find('input.hxlValue').eq(0)})

    _hxlUpdate: (e)->
      tag = @$el.find('input.hxlTag').val()

      attrs = @$el.find('input.hxlAttrs').val()
      attrs = attrs.replace(/,/g, '+')
      hxlArray = [];

      if (tag)
        @$el.find('input.hxlAttrs').select2('enable', true)
        hxlArray.push('hxl:' + tag)
        if (attrs)
          aA = attrs.split('+')
          _.map(aA, (_a)->
            hxlArray.push('hxl:+' + _a)
          )
      else
        @$el.find('input.hxlAttrs').select2('enable', false)

      @model.set('value', hxlArray)
      @model.trigger('change')

    _hxlTagCleanup: (term)->
      if term.length >= 2
        regex = /\W+/g
        term = "#" + term.replace(regex, '').toLowerCase()
        return {id: term, text: term}

    _hxlTagSanitize: (e)->
      if e.target.value.length >= 2
        regex = /\W+/g
        e.target.value = "#" + e.target.value.replace(regex, '')

    _hxlTagSelecting: (e)->
      if e.val.length < 2
        e.preventDefault()

    _hxlAttrCleanup: (term)->
      regex = /\W+/g
      term = term.replace(regex, '').toLowerCase()
      return {id: term, text: term}


  viewRowDetail.DetailViewMixins.default =
    html: ->
      @fieldTab = "active"
      @$el.addClass("card__settings__fields--#{@fieldTab}")
      label = if @model.key == 'default' then _t("Default value") else @model.key.replace(/_/g, ' ')
      viewRowDetail.Templates.textbox @cid, @model.key, label, 'text'
    afterRender: ->
      @$el.find('input').eq(0).val(@model.get("value"))
      @listenForInputChange()

  viewRowDetail.DetailViewMixins._isRepeat =
    html: ->
      @$el.addClass("card__settings__fields--active")
      viewRowDetail.Templates.checkbox @cid, @model.key, _t("Repeat"), _t("Repeat this group if necessary")
    afterRender: ->
      @listenForCheckboxChange()

  # handled by mandatorySettingSelector
  viewRowDetail.DetailViewMixins.required =
    getOptions: () ->
      options = [
        {
          label: 'Always',
          value: 'yes'
        },
        {
          label: 'Conditional'
          value: 'conditional'
        },
        {
          label: 'Never',
          value: ''
        }
      ]
      options
    html: ->
      @$el.addClass("card__settings__fields--active")
      viewRowDetail.Templates.radioButton @cid, @model.key, @getOptions(), _t("Required")
    afterRender: ->
      options = @getOptions()
      el = @$("input[type=radio][name=#{@model.key}]")
      $el = $(el)
      $input = $('<input/>', {class:'text', type: 'text', style: 'width: auto; margin-left: 5px;'})
      changing = false

      reflectValueInEl = ()=>
        if !changing
          modelValue = @model.get('value')
          if modelValue == ''
            willSelectedEl = @$("input[type=radio][name=#{@model.key}][id='option_Never']")
          else if modelValue == 'yes'
            willSelectedEl = @$("input[type=radio][name=#{@model.key}][value=#{modelValue}]")
          else
            willSelectedEl = @$("input[type=radio][name=#{@model.key}][id='option_Conditional']")
            @$('#label_Conditional').append $input
            @listenForInputChange el: $input

          $willSelectedEl = $(willSelectedEl)
          $willSelectedEl.prop('checked', true)

      @model.on 'change:value', reflectValueInEl
      reflectValueInEl()

      $el.on 'change', ()=>
        changing = true
        selectedEl = @$("input[type=radio][name=#{@model.key}]:checked")
        $selectedEl = $(selectedEl)
        selectedVal = $selectedEl.val()
        if selectedVal is 'conditional'
          @model.set('value', '')
          @$('#label_Conditional').append $input
          @listenForInputChange el: $input
        else
          @model.set('value', selectedVal)
          $input.remove()
        changing = false

  viewRowDetail.DetailViewMixins.appearance =
    getTypes: () ->
      types =
        text: ['multiline']
        select_one: ['minimal', 'columns', 'columns-pack', 'columns-4', 'columns no-buttons', 'columns-pack no-buttons', 'columns-4 no-buttons', 'likert', 'image-map']
        select_multiple: ['minimal', 'columns', 'columns-pack', 'columns-4', 'columns no-buttons', 'columns-pack no-buttons', 'columns-4 no-buttons', 'image-map']
        image: ['draw', 'annotate', 'signature']
        date: ['month-year', 'year']

      types[@model_type()]
    html: ->
      @$checkbox_samescreen = $('<input/>', { type: "checkbox", id: "checkbox-samescreen", style: 'margin-top: 10px;' })
      @$label_checkbox_samescreen = $('<span/>', { style: 'margin-left: 4px;' }).text(_t('Show all questions in this group on the same screen'))
      @fieldListStr = 'field-list'
      @$select_width = $('<select/>', { id: "select-width", style: 'margin-top: 5px;' })
      @$label_select_width = $('<span/>', { style: 'display: block; margin-top: 10px;' }).text(_t('Width') + ":")
      @select_width_default_value = ''
      $('<option />', {value: "select", text: "Width not selected (w4 will be used)"}).appendTo(@$select_width)
      @width_options = []
      for option in [1..10]
        @width_options.push "w#{option}"
      for width_option in @width_options
        $('<option />', {value: "#{width_option}", text: "#{width_option}"}).appendTo(@$select_width)
      @$textbox_other = null
      @is_input_select = false
      @is_input_text_other = false
      @is_checkbox_samescreen = false
      @$el.addClass("card__settings__fields--active")
      if @model_is_group(@model)
        return viewRowDetail.Templates.textbox @cid, @model.key, _t("Appearance (advanced)"), 'text'
      else
        if @model_type() isnt 'calculate'
          appearances = @getTypes()
          if appearances?
            appearances.push 'other'
            appearances.unshift 'select'
            @is_input_select = true
            return viewRowDetail.Templates.dropdown @cid, @model.key, appearances, _t("Appearance (advanced)")
          else
            return viewRowDetail.Templates.textbox @cid, @model.key, _t("Appearance (advanced)"), 'text'

    model_is_group: (model) ->
      model._parent.constructor.key == 'group'

    model_get_parent_group: () ->
      perent_group = null
      if @model._parent._parent._parent? and @model._parent._parent._parent.constructor.key == 'group'
        parent_group = @model._parent._parent._parent
      parent_group

    model_get_parent_group_appearance: () ->
      parent_group = @model_get_parent_group()
      if parent_group?
        parent_group.get('appearance').getValue()

    model_type: () ->
      @model._parent.getValue('type').split(' ')[0]

    is_form_style_exist: () ->
      sessionStorage.getItem('kpi.editable-form.form-style') != ''

    is_form_style: (style) ->
      sessionStorage.getItem('kpi.editable-form.form-style').indexOf(style) isnt -1

    is_form_style_pages: () ->
      @is_form_style('pages')

    is_form_style_theme_grid: () ->
      @is_form_style('theme-grid')

    not_group_inputs_change_handler: () ->
      model_set_value = ''

      if @is_input_select
        if @is_input_text_other
          textbox_other_value = @$textbox_other.val().trim()
          model_set_value = textbox_other_value
        else
          $select = @$('select').not('#select-width')
          select_value = $select.val()
          select_value = '' if select_value == 'select'
          model_set_value = select_value
      else # input text
        $input = @$('input')
        input_value = $input.val().trim()
        model_set_value = input_value

      select_width_value = @$select_width.val()
      select_width_value = @select_width_default_value if select_width_value == 'select'
      if model_set_value != ''
        if select_width_value != ''
          model_set_value += " #{select_width_value}"
      else
        model_set_value = select_width_value
      
      @model.set 'value', model_set_value

    group_inputs_change_handler: () ->
      model_set_value = ''

      if @is_checkbox_samescreen
        show_samescreen = @$checkbox_samescreen.prop('checked')
        if show_samescreen
          model_set_value = @fieldListStr

      $input = @$('input')
      input_value = $input.val().trim()
      if model_set_value != ''
        if input_value != ''
          model_set_value += " #{input_value}"
      else
        model_set_value = input_value
      
      select_width_value = @$select_width.val()
      select_width_value = @select_width_default_value if select_width_value == 'select'
      if model_set_value != ''
        if select_width_value != ''
          model_set_value += " #{select_width_value}"
      else
        model_set_value = select_width_value

      @model.set 'value', model_set_value

    add_input_text_change_handler: ($input, handler) ->
      handler = handler.bind @
      $input.off 'change'
      $input.on 'change', () =>
        handler()
      $input.off 'blur'
      $input.on 'blur', () =>
        handler()
      $input.off 'keyup'
      $input.on 'keyup', (evt) =>
        if evt.key is 'Enter' or evt.keyCode is 13
          $input.blur()
        else
          handler()

    is_same_screen_in_model_value: () ->
      modelValue = @model.get 'value'
      (modelValue.indexOf @fieldListStr) > -1

    get_width_from_model_value: () ->
      modelValue = @model.get 'value'
      model_width = null
      for width_option in @width_options
        model_width = width_option if ((modelValue.indexOf width_option) > -1)
      model_width

    get_select_value_from_model_value: () ->
      modelValue = @model.get 'value'
      select_value = null
      select_values = []
      for type in @getTypes()
        select_values.push(type) if ((modelValue.indexOf type) > -1)

      if select_values.length > 0
        if select_values.length == 1
          select_value = select_values[0]
        else
          for value in select_values
            if ((modelValue.indexOf value) > -1)
              if select_value?
                if select_value.length < value.length
                  select_value = value
              else
                select_value = value

      select_value

    afterRender: ->
      modelValue = @model.get 'value'
      if @model_is_group(@model)
        $input = @$('input')

        if @is_form_style_theme_grid()
          @$('.settings__input').append(@$label_select_width)
          @$('.settings__input').append(@$select_width)

        if @is_form_style_exist() and @is_form_style_pages()
          $container_checkbox_samescreen = $('<div/>')
          $container_checkbox_samescreen.append(@$checkbox_samescreen)
          $container_checkbox_samescreen.append(@$label_checkbox_samescreen)
          @$('.settings__input').append($container_checkbox_samescreen)
          @is_checkbox_samescreen = true

        if modelValue? and modelValue != '' # Parse existing value
          modelValue = modelValue.trim()
          samescreen_value = null
          text_input_value = null
          select_width_value = null

          if @is_same_screen_in_model_value()
            samescreen_value = @fieldListStr
            modelValue = modelValue.split(samescreen_value).join('') # remove samescreen_value from modelValue

          width_model_value = @get_width_from_model_value()
          if width_model_value?
            select_width_value = width_model_value
            modelValue = modelValue.split(select_width_value).join('') # remove select_width_value from modelValue

          modelValue = modelValue.trim()
          if modelValue != ''
            text_input_value = modelValue

        if samescreen_value?
          @$checkbox_samescreen.prop('checked', true)
        if text_input_value?
          $input.val(text_input_value)
        if select_width_value?
          @$select_width.val(select_width_value)

        @add_input_text_change_handler($input, @group_inputs_change_handler)
        
        @$select_width.off 'change'
        @$select_width.on 'change', () =>
          @group_inputs_change_handler()
        
        @$checkbox_samescreen.off 'change'
        @$checkbox_samescreen.on 'change', () =>
          @group_inputs_change_handler()

      else # not group. this is question item appearance settings
        if @is_form_style_theme_grid()
          @$('.settings__input').append(@$label_select_width)
          @$('.settings__input').append(@$select_width)

          parent_column = 4
          if @model_get_parent_group()? and @model_get_parent_group_appearance() != ''
            parent_group_appearance = @model_get_parent_group_appearance()
            if parent_group_appearance.indexOf(' ') == -1 # no space in parent_group_appearance
              if parent_group_appearance in @width_options
                parent_column = parent_group_appearance.slice(1)
            else
              parent_group_appearance_last_value = parent_group_appearance.slice(parent_group_appearance.lastIndexOf(' ') + 1)
              if parent_group_appearance_last_value in @width_options
                parent_column = parent_group_appearance_last_value.slice(1)

          parent_column = parseInt parent_column, 10
          text_parent_columns = "Parent group has #{parent_column} columns"
          if parent_column == 1
            text_parent_columns = text_parent_columns.replace('columns', 'column')
          $label_parent_columns = $('<span/>', { style: 'margin-left: 5px;' }).text(_t("#{text_parent_columns}"))
          @$('.settings__input').append($label_parent_columns)

        $select = @$('select').not('#select-width')
        if $select.length > 0 # Question item appearance is dropdown
          @$textbox_other = $('<input/>', { class:'text', type: 'text', width: 'auto', style: 'display: block; margin-top: 5px;' })

          if modelValue? and modelValue != '' # Parse existing value
            modelValue = modelValue.trim()
            select_value = null
            other_value = null
            select_width_value = null

            select_model_value = @get_select_value_from_model_value()
            if select_model_value?
              select_value = select_model_value
              modelValue = modelValue.split(select_value).join('') # remove select_value from modelValue

            width_model_value = @get_width_from_model_value()
            if width_model_value?
              select_width_value = width_model_value
              modelValue = modelValue.split(select_width_value).join('') # remove select_width_value from modelValue

            modelValue = modelValue.trim()
            if modelValue != ''
              other_value = modelValue

            if select_value?
              $select.val(select_value)
            if select_width_value?
              @$select_width.val(select_width_value)
            if other_value?
              $select.val('other')
              @$textbox_other.insertAfter $select
              @$textbox_other.val(other_value)
              @is_input_text_other = true
              @add_input_text_change_handler(@$textbox_other, @not_group_inputs_change_handler)

          @$select_width.on 'change', () =>
            @not_group_inputs_change_handler()

          $select.on 'change', () =>
            if $select.val() == 'other'
              @$textbox_other.insertAfter $select
              @is_input_text_other = true
              @add_input_text_change_handler(@$textbox_other, @not_group_inputs_change_handler)
            else
              @$textbox_other.val('')
              @$textbox_other.remove()
              @is_input_text_other = false
              @not_group_inputs_change_handler()

        else # Question item appearance is text input
          $input = @$('input')
          if modelValue? and modelValue != '' # Parse existing value
            modelValue = modelValue.trim()
            input_value = null
            select_width_value = null

            width_model_value = @get_width_from_model_value()
            if width_model_value?
              select_width_value = width_model_value
              modelValue = modelValue.split(select_width_value).join('') # remove select_width_value from modelValue

            modelValue = modelValue.trim()
            if modelValue != ''
              input_value = modelValue

            if input_value?
              $input.val(input_value)
            if select_width_value?
              @$select_width.val(select_width_value)

          @add_input_text_change_handler($input, @group_inputs_change_handler)

          @$select_width.on 'change', () =>
            @group_inputs_change_handler()


  viewRowDetail.DetailViewMixins.oc_item_group =
    onOcCustomEvent: (ocCustomEventArgs) ->
      questionId = @model._parent.cid
      sender = ocCustomEventArgs.sender
      senderValue = ocCustomEventArgs.value
      senderQuestionId = sender._parent.cid
      if (sender.key is 'bind::oc:external') and (questionId is senderQuestionId)
        @$el.siblings(".message").remove();
        @$el.closest('div').removeClass("input-error")
        if senderValue in ['clinicaldata', 'contactdata']
          @removeRequired()
          @makeFieldCheckCondition({
            checkIfNotEmpty: true,
            message: 'This field must be empty for external "clinicaldata" or "contactdata" items'
          })
        else
          @$el.removeClass('hidden')
          @makeRequired()
      else
        @makeRequired()
    html: ->
      @fieldTab = "active"
      @$el.addClass("card__settings__fields--#{@fieldTab}")
      viewRowDetail.Templates.textbox @cid, @model.key, _t("Item Group"), 'text', 'Enter data set name'
    afterRender: ->
      @listenForInputChange()
      @makeRequired()

  viewRowDetail.DetailViewMixins.oc_briefdescription =
    html: ->
      @fieldTab = "active"
      @$el.addClass("card__settings__fields--#{@fieldTab}")
      viewRowDetail.Templates.textbox @cid, @model.key, _t("Item Brief Description"), 'text', 'Enter variable title (may be used in display table column headers) (optional)', '40'
    afterRender: ->
      @listenForInputChange()

  viewRowDetail.DetailViewMixins.oc_external =
    model_type: () ->
      @model._parent.getValue('type').split(' ')[0]
    getOptions: () ->
      types =
        text: ['contactdata']
        calculate: ['clinicaldata', 'contactdata']
      types[@model_type()]
    html: ->
      @fieldTab = "active"
      @$el.addClass("card__settings__fields--#{@fieldTab}")

      if @model_type() in ['calculate', 'text']
        options = @getOptions()
        if options?
            options.unshift 'No'
        return viewRowDetail.Templates.dropdown @cid, @model.key, options, _t("Use External Value")
    afterRender: ->
      $select = @$('select')

      @contact_data_type_class_name = 'contact-data-type'
      @$label_select_contact_data_type = $('<span/>', { class: @contact_data_type_class_name, style: 'display: block; margin-top: 10px;' }).text(_t('Contact Data Type') + ":")
      @$select_contact_data_type = $('<select/>', { class: @contact_data_type_class_name, style: 'margin-top: 5px;' })
      $('<option />', {value: "select", text: "- select -"}).appendTo(@$select_contact_data_type)
      @contact_data_type_options = ['firstname', 'lastname', 'email', 'mobilenumber', 'secondaryid']
      for contact_data_type_option in @contact_data_type_options
        $('<option />', {value: "#{contact_data_type_option}", text: "#{contact_data_type_option}"}).appendTo(@$select_contact_data_type)

      fieldClass = 'input-error'
      message = "Constraint / Constraint Message is not empty"
      showMessage = () =>
        $select.closest('div').addClass(fieldClass)
        if $select.siblings('.message').length is 0
          $message = $('<div/>').addClass('message').text(_t(message))
          $select.after($message)

      hideMessage = () =>
        $select.closest('div').removeClass(fieldClass)
        $select.siblings('.message').remove()

      addSelectContactDataType = () =>
        @$('.settings__input').append(@$label_select_contact_data_type)
        @$('.settings__input').append(@$select_contact_data_type)

        bind_contactdata_value = @rowView.model.attributes['bind::oc:contactdata'].get 'value'
        instance_contactdata_value = @rowView.model.attributes['instance::oc:contactdata'].get 'value'
        if bind_contactdata_value != '' and (bind_contactdata_value in @contact_data_type_options)
          @$select_contact_data_type.val(bind_contactdata_value)
        else if instance_contactdata_value != '' and (instance_contactdata_value in @contact_data_type_options)
          @$select_contact_data_type.val(instance_contactdata_value)

        @$select_contact_data_type.change () =>
          if @$select_contact_data_type.val() == 'select'
            @rowView.model.attributes['instance::oc:contactdata'].set 'value', ''
          else
            @rowView.model.attributes['instance::oc:contactdata'].set 'value', @$select_contact_data_type.val()

      modelValue = @model.get 'value'
      if $select.length > 0
        if modelValue == ''
          $select.val('No')
        else
          $select.val(modelValue)
          Backbone.trigger('ocCustomEvent', { sender: @model, value: modelValue })

          if modelValue == 'contactdata'
            addSelectContactDataType()

        $select.change () =>
          Backbone.trigger('ocCustomEvent', { sender: @model, value: $select.val() })
          if $select.siblings(".#{@contact_data_type_class_name}").length > 0
            $select.siblings(".#{@contact_data_type_class_name}").remove()
          if $select.val() == 'No'
            @model.set 'value', ''
            hideMessage()
          else
            @model.set 'value', $select.val()
            if $select.val() == 'contactdata'
              addSelectContactDataType()
              constraint_value = @rowView.model.attributes.constraint.getValue()
              constraint_message_value = @rowView.model.attributes.constraint_message.getValue()
              if (constraint_value != '') or (constraint_message_value != '')
                showMessage()

  viewRowDetail.DetailViewMixins.readonly =
    html: ->
      @fieldTab = "active"
      @$el.addClass("card__settings__fields--#{@fieldTab}")
      viewRowDetail.Templates.checkbox @cid, @model.key, _t("Read only")
    afterRender: ->
      @listenForCheckboxChange()

  viewRowDetail.DetailViewMixins.calculation =
    html: ->
      @fieldTab = "active"
      @$el.addClass("card__settings__fields--#{@fieldTab}")
      viewRowDetail.Templates.textbox @cid, @model.key, _t("Calculation"), 'text'
    afterRender: ->
      questionType = @model._parent.get('type').get('typeId')

      @listenForInputChange()
      if questionType is 'calculate'
        @makeRequired()

  viewRowDetail.DetailViewMixins.oc_description =
    html: ->
      @fieldTab = "active"
      @$el.addClass("card__settings__fields--#{@fieldTab}")
      viewRowDetail.Templates.textbox @cid, @model.key, _t("Item Description"), 'text', 'Enter variable definition (e.g., CDASH data definition) (optional)', '3999'
    afterRender: ->
      @listenForInputChange()

  viewRowDetail.DetailViewMixins.select_one_from_file_filename =
    html: ->
      @fieldTab = "active"
      @$el.addClass("card__settings__fields--#{@fieldTab}")
      viewRowDetail.Templates.textbox @cid, @model.key, _t("External List Filename"), 'text', 'Enter external list filename'
    afterRender: ->
      @listenForInputChange()
      @makeRequired()

  viewRowDetail.DetailViewMixins.trigger =
    getOptions: () ->
      currentQuestion = @model._parent
      non_selectable = ['datetime', 'time', 'note', 'group', 'kobomatrix', 'repeat', 'rank', 'score', 'calculate']
      
      questions = []
      currentQuestion.getSurvey().forEachRow (question) =>
        if (question.getValue('type') not in non_selectable) and (question.cid != currentQuestion.cid)
          questions.push question
      , includeGroups:true

      options = []
      options = _.map(questions, (row) ->
        return {
          value: "${#{row.getValue('name')}}"
          text: "#{row.getValue('label')} (${#{row.getValue('name')}})"
        }
      )
      # add placeholder message/option
      options.unshift({
        value: ''
        text: _t("No Trigger")
      })
      options
    html: ->
      @fieldTab = "active"
      @$el.addClass("card__settings__fields--#{@fieldTab}")
      options = @getOptions()
      
      return viewRowDetail.Templates.dropdown @cid, @model.key, options, _t("Calculation trigger")
    afterRender: ->
      $select = @$('select')
      modelValue = @model.get 'value'
      if $select.length > 0
        if modelValue != ''
          $select.val(modelValue)

        $select.change () =>
          @model.set 'value', $select.val()

  viewRowDetail
