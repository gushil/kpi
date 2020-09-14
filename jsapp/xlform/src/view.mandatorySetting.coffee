_ = require 'underscore'
_t = require('utils').t
Backbone = require 'backbone'
$configs = require './model.configs'
$baseView = require './view.pluggedIn.backboneView'
$viewTemplates = require './view.templates'

module.exports = do ->
  class MandatorySettingView extends $baseView
    className: 'mandatory-setting'
    events: {
      'input .js-mandatory-setting-radio': 'onRadioChange'
      'keyup .js-mandatory-setting-custom-text': 'onCustomTextKeyup'
      'blur .js-mandatory-setting-custom-text': 'onCustomTextBlur'
    }

    initialize: ({@model}) ->
      if @model
        @model.on('change', @render, @)
      return

    render: ->
      reqVal = @getChangedValue()
      template = $($viewTemplates.$$render("row.mandatorySettingSelector", "required_#{@model.cid}", reqVal))
      @$el.html(template)
      if reqVal isnt 'true' and reqVal isnt 'false'
        @$el.find('.js-mandatory-setting-custom-text').val(reqVal)
      return @

    insertInDOM: (rowView)->
      @$el.appendTo(rowView.defaultRowDetailParent)
      return

    showMessage: () ->
      fieldClass = 'input-error'
      message = "This field is required"
      customEl = @$el.find('.js-mandatory-setting-custom-text')
      $customEl = $(customEl)
      $customEl.closest('label').addClass(fieldClass)
      if $customEl.siblings('.message').length is 0
        $message = $('<div/>').addClass('message').text(_t(message))
        $customEl.after($message)
    
    hideMessage: () ->
      fieldClass = 'input-error'
      customEl = @$el.find('.js-mandatory-setting-custom-text')
      $customEl = $(customEl)
      $customEl.closest('label').removeClass(fieldClass)
      $customEl.siblings('.message').remove()
    
    showOrHideCondition: () ->
      customEl = @$el.find('.js-mandatory-setting-custom-text')
      $customEl = $(customEl)
      if $customEl.val() == ''
        @showMessage()
      else
        @hideMessage()
    
    onRadioChange: (evt) ->
      val = evt.currentTarget.value
      if val is 'custom'
        @setNewValue('')
        @$el.find('.js-mandatory-setting-custom-text').focus()
        @showOrHideCondition()
      else
        @setNewValue(val)
      return

    onCustomTextKeyup: (evt) ->
      if evt.key is 'Enter' or evt.keyCode is 13 or evt.which is 13
        evt.target.blur()
      else
        val = evt.currentTarget.value
        @setNewValue(val)
        @$el.find('.js-mandatory-setting-custom-text').focus()
        @showOrHideCondition()
      return

    onCustomTextBlur: (evt) ->
      val = evt.currentTarget.value
      @setNewValue(val)
      @showOrHideCondition()
      return

    getChangedValue: ->
      val = @model.getValue()
      changedVal = @model.changed?.required?.attributes?.value
      if typeof changedVal isnt 'undefined'
        return String(changedVal)
      return String(val)

    setNewValue: (val) ->
      if @model.get('value') is true or @model.get('value') is false
        if val isnt ''
          @model.set('value', val)
      else
        @model.set('value', val)
      return

  MandatorySettingView: MandatorySettingView
