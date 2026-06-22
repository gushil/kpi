{expect} = require('../helper/fauxChai')

window.t ?= (str) -> str

$model = require('../../jsapp/xlform/src/_model')
$configs = require('../../jsapp/xlform/src/model.configs')

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

# Build a survey with a single row of the given type and return [survey, row]
buildSurveyWithRow = (type, extraAttrs = {}) ->
  survey = new $model.Survey()
  survey.rows.add($.extend({type: type, name: 'test_q', label: 'Test Question'}, extraAttrs))
  row = survey.rows.at(0)
  [survey, row]

# Get the RowDetail model for a specific key from a row
getDetail = (row, key) ->
  row.get(key)

do ->
  ###############################################################
  # model.base.RowDetail — value initialisation
  ###############################################################
  describe 'model.base.RowDetail: value initialisation', ->
    beforeEach ->
      window.xlfHideWarnings = true
      [@survey, @row] = buildSurveyWithRow('text')
    afterEach ->
      window.xlfHideWarnings = false

    it 'row has a name RowDetail', ->
      expect(getDetail(@row, 'name')).toBeDefined()

    it 'row has a label RowDetail', ->
      expect(getDetail(@row, 'label')).toBeDefined()

    it 'row has a required RowDetail', ->
      expect(getDetail(@row, 'required')).toBeDefined()

    it 'row has a readonly RowDetail', ->
      expect(getDetail(@row, 'readonly')).toBeDefined()

    it 'row has an appearance RowDetail', ->
      expect(getDetail(@row, 'appearance')).toBeDefined()

    it 'row has a default RowDetail', ->
      expect(getDetail(@row, 'default')).toBeDefined()

    it 'row has a calculation RowDetail', ->
      expect(getDetail(@row, 'calculation')).toBeDefined()

    it 'row has a trigger RowDetail', ->
      expect(getDetail(@row, 'trigger')).toBeDefined()

    it 'row has a bind::oc:itemgroup RowDetail (Item Group)', ->
      expect(getDetail(@row, 'bind::oc:itemgroup')).toBeDefined()

    it 'row has a bind::oc:briefdescription RowDetail (Item Brief Description)', ->
      expect(getDetail(@row, 'bind::oc:briefdescription')).toBeDefined()

    it 'row has a bind::oc:description RowDetail (Item Description)', ->
      expect(getDetail(@row, 'bind::oc:description')).toBeDefined()

    it 'row has a bind::oc:external RowDetail (Use External Value)', ->
      expect(getDetail(@row, 'bind::oc:external')).toBeDefined()

    it 'required defaults to "false" for text questions', ->
      expect(getDetail(@row, 'required').get('value')).toBe('false')

    it 'readonly defaults to empty string for text questions', ->
      expect(getDetail(@row, 'readonly').get('value')).toBe('')

    it 'appearance defaults to empty string for text questions', ->
      expect(getDetail(@row, 'appearance').get('value')).toBe('')

    it 'default value defaults to empty string for text questions', ->
      expect(getDetail(@row, 'default').get('value')).toBe('')

    it 'calculation defaults to empty string for text questions', ->
      expect(getDetail(@row, 'calculation').get('value')).toBe('')

    it 'trigger defaults to empty string for text questions', ->
      expect(getDetail(@row, 'trigger').get('value')).toBe('')

    it 'bind::oc:itemgroup defaults to empty string', ->
      expect(getDetail(@row, 'bind::oc:itemgroup').get('value')).toBe('')

    it 'bind::oc:briefdescription defaults to empty string', ->
      expect(getDetail(@row, 'bind::oc:briefdescription').get('value')).toBe('')

    it 'bind::oc:description defaults to empty string', ->
      expect(getDetail(@row, 'bind::oc:description').get('value')).toBe('')

    it 'bind::oc:external defaults to empty string', ->
      expect(getDetail(@row, 'bind::oc:external').get('value')).toBe('')

  ###############################################################
  # model.base.RowDetail — value mutation and change events
  ###############################################################
  describe 'model.base.RowDetail: value mutation', ->
    beforeEach ->
      window.xlfHideWarnings = true
      [@survey, @row] = buildSurveyWithRow('text')
    afterEach ->
      window.xlfHideWarnings = false

    it 'can set Item Name (name) value', ->
      getDetail(@row, 'name').set('value', 'new_item_name')
      expect(getDetail(@row, 'name').get('value')).toBe('new_item_name')

    it 'can set Item Group (bind::oc:itemgroup) value', ->
      getDetail(@row, 'bind::oc:itemgroup').set('value', 'group1')
      expect(getDetail(@row, 'bind::oc:itemgroup').get('value')).toBe('group1')

    it 'can set Item Brief Description value', ->
      getDetail(@row, 'bind::oc:briefdescription').set('value', 'Short title')
      expect(getDetail(@row, 'bind::oc:briefdescription').get('value')).toBe('Short title')

    it 'can set Item Description value', ->
      getDetail(@row, 'bind::oc:description').set('value', 'CDASH definition')
      expect(getDetail(@row, 'bind::oc:description').get('value')).toBe('CDASH definition')

    it 'can set appearance value', ->
      getDetail(@row, 'appearance').set('value', 'multiline')
      expect(getDetail(@row, 'appearance').get('value')).toBe('multiline')

    it 'can set required to "yes" (Always)', ->
      getDetail(@row, 'required').set('value', 'yes')
      expect(getDetail(@row, 'required').get('value')).toBe('yes')

    it 'can set required to "" (Never)', ->
      getDetail(@row, 'required').set('value', '')
      expect(getDetail(@row, 'required').get('value')).toBe('')

    it 'can set readonly to "true" (Yes)', ->
      getDetail(@row, 'readonly').set('value', 'true')
      expect(getDetail(@row, 'readonly').get('value')).toBe('true')

    it 'can set default value', ->
      getDetail(@row, 'default').set('value', 'some default')
      expect(getDetail(@row, 'default').get('value')).toBe('some default')

    it 'can set calculation expression', ->
      getDetail(@row, 'calculation').set('value', '${a} + ${b}')
      expect(getDetail(@row, 'calculation').get('value')).toBe('${a} + ${b}')

    it 'can set trigger value', ->
      getDetail(@row, 'trigger').set('value', '${prev_q}')
      expect(getDetail(@row, 'trigger').get('value')).toBe('${prev_q}')

    it 'can set Use External Value (bind::oc:external)', ->
      getDetail(@row, 'bind::oc:external').set('value', 'clinicaldata')
      expect(getDetail(@row, 'bind::oc:external').get('value')).toBe('clinicaldata')

    it 'getValue() delegates through RowDetail chain', ->
      getDetail(@row, 'bind::oc:itemgroup').set('value', 'mygroup')
      expect(@row.getValue('bind::oc:itemgroup')).toBe('mygroup')

  ###############################################################
  # model.base.RowDetail — getSurvey()
  ###############################################################
  describe 'model.base.RowDetail: getSurvey()', ->
    beforeEach ->
      window.xlfHideWarnings = true
      [@survey, @row] = buildSurveyWithRow('text')
    afterEach ->
      window.xlfHideWarnings = false

    it 'RowDetail.getSurvey() returns the parent survey', ->
      detail = getDetail(@row, 'name')
      expect(detail.getSurvey()).toBe(@survey)

    it 'getSurvey() works for all OC-specific fields', ->
      for key in ['bind::oc:itemgroup', 'bind::oc:briefdescription',
                  'bind::oc:description', 'bind::oc:external']
        expect(getDetail(@row, key).getSurvey()).toBe(@survey)
      return

  ###############################################################
  # model.base.RowDetail — change:value event propagation
  ###############################################################
  describe 'model.base.RowDetail: change event propagation', ->
    beforeEach ->
      window.xlfHideWarnings = true
      [@survey, @row] = buildSurveyWithRow('text')
    afterEach ->
      window.xlfHideWarnings = false

    it 'changing name fires survey change event', ->
      fired = false
      @survey.on 'change', -> fired = true
      getDetail(@row, 'name').set('value', 'fire_test')
      expect(fired).toBe(true)

    it 'changing bind::oc:itemgroup fires survey change event', ->
      fired = false
      @survey.on 'change', -> fired = true
      getDetail(@row, 'bind::oc:itemgroup').set('value', 'fired_group')
      expect(fired).toBe(true)

    it 'changing readonly fires survey change event', ->
      fired = false
      @survey.on 'change', -> fired = true
      getDetail(@row, 'readonly').set('value', 'true')
      expect(fired).toBe(true)

    it 'changing calculation fires survey change event', ->
      fired = false
      @survey.on 'change', -> fired = true
      getDetail(@row, 'calculation').set('value', '1 + 1')
      expect(fired).toBe(true)

    it 'changing trigger fires survey change event', ->
      fired = false
      @survey.on 'change', -> fired = true
      getDetail(@row, 'trigger').set('value', '${q1}')
      expect(fired).toBe(true)

  ###############################################################
  # model.base.RowDetail — toJSON() output (question settings influence export)
  ###############################################################
  describe 'model.base.RowDetail: JSON export reflects field values', ->
    beforeEach ->
      window.xlfHideWarnings = true
    afterEach ->
      window.xlfHideWarnings = false

    it 'Item Name is present in survey JSON export', ->
      survey = new $model.Survey()
      survey.rows.add(type: 'text', name: 'my_q', label: 'My Q')
      result = survey.toJSON()
      expect(result.survey[0]['name']).toBe('my_q')

    it 'readonly "true" appears in survey JSON export', ->
      survey = new $model.Survey()
      survey.rows.add(type: 'text', name: 'q1', label: 'Q1')
      survey.rows.at(0).get('readonly').set('value', 'true')
      result = survey.toJSON()
      row = result.survey[0]
      expect(row['readonly']).toBe('true')

    it 'empty readonly is omitted from survey JSON export', ->
      survey = new $model.Survey()
      survey.rows.add(type: 'text', name: 'q1', label: 'Q1')
      result = survey.toJSON()
      row = result.survey.find((r) -> r.name is 'q1')
      delete row['$kuid']
      expect(row['readonly']).toBeUndefined()

    it 'bind::oc:itemgroup value is included in JSON export when set', ->
      survey = new $model.Survey()
      survey.rows.add(type: 'text', name: 'q1', label: 'Q1')
      survey.rows.at(0).get('bind::oc:itemgroup').set('value', 'datagroup')
      result = survey.toJSON()
      row = result.survey[0]
      expect(row['bind::oc:itemgroup']).toBe('datagroup')

    it 'bind::oc:briefdescription is included when set', ->
      survey = new $model.Survey()
      survey.rows.add(type: 'text', name: 'q1', label: 'Q1')
      survey.rows.at(0).get('bind::oc:briefdescription').set('value', 'Brief title')
      result = survey.toJSON()
      row = result.survey[0]
      expect(row['bind::oc:briefdescription']).toBe('Brief title')

    it 'bind::oc:description is included when set', ->
      survey = new $model.Survey()
      survey.rows.add(type: 'text', name: 'q1', label: 'Q1')
      survey.rows.at(0).get('bind::oc:description').set('value', 'CDASH def')
      result = survey.toJSON()
      row = result.survey[0]
      expect(row['bind::oc:description']).toBe('CDASH def')

    it 'bind::oc:external is included when set', ->
      survey = new $model.Survey()
      survey.rows.add(type: 'text', name: 'q1', label: 'Q1')
      survey.rows.at(0).get('bind::oc:external').set('value', 'contactdata')
      result = survey.toJSON()
      row = result.survey[0]
      expect(row['bind::oc:external']).toBe('contactdata')

    it 'calculation is included when set', ->
      survey = new $model.Survey()
      survey.rows.add(type: 'calculate', name: 'calc_q', label: 'Calc')
      survey.rows.at(0).get('calculation').set('value', '1 + 1')
      result = survey.toJSON()
      row = result.survey[0]
      expect(row['calculation']).toBe('1 + 1')

    it 'trigger is included in JSON export when set', ->
      survey = new $model.Survey()
      survey.rows.add(type: 'calculate', name: 'trig_q', label: 'Trig')
      survey.rows.at(0).get('trigger').set('value', '${prev}')
      result = survey.toJSON()
      row = result.survey[0]
      expect(row['trigger']).toBe('${prev}')

    it 'default value is included when set', ->
      survey = new $model.Survey()
      survey.rows.add(type: 'text', name: 'q1', label: 'Q1')
      survey.rows.at(0).get('default').set('value', 'init_val')
      result = survey.toJSON()
      row = result.survey[0]
      expect(row['default']).toBe('init_val')

  ###############################################################
  # Per question-type: field defaults for each of the 13 types
  ###############################################################
  describe 'model.base.RowDetail: default field values per question type', ->
    beforeEach ->
      window.xlfHideWarnings = true
    afterEach ->
      window.xlfHideWarnings = false

    types = [
      'select_one', 'select_multiple', 'text', 'integer',
      'decimal', 'calculate', 'date', 'note',
      'file', 'image', 'audio', 'video', 'select_one_from_file'
    ]

    for qtype in types
      do (qtype) ->
        describe "type: #{qtype}", ->
          it 'required defaults to "false"', ->
            [survey, row] = buildSurveyWithRow(qtype)
            expect(getDetail(row, 'required').get('value')).toBe('false')


          it 'readonly defaults to ""', ->
            [survey, row] = buildSurveyWithRow(qtype)
            expect(getDetail(row, 'readonly').get('value')).toBe('')

          it 'has a bind::oc:itemgroup detail', ->
            [survey, row] = buildSurveyWithRow(qtype)
            expect(getDetail(row, 'bind::oc:itemgroup')).toBeDefined()

          it 'has a bind::oc:briefdescription detail', ->
            [survey, row] = buildSurveyWithRow(qtype)
            expect(getDetail(row, 'bind::oc:briefdescription')).toBeDefined()

          it 'has a bind::oc:description detail', ->
            [survey, row] = buildSurveyWithRow(qtype)
            expect(getDetail(row, 'bind::oc:description')).toBeDefined()

          it 'has an appearance detail', ->
            [survey, row] = buildSurveyWithRow(qtype)
            expect(getDetail(row, 'appearance')).toBeDefined()

          it 'has a calculation detail', ->
            [survey, row] = buildSurveyWithRow(qtype)
            expect(getDetail(row, 'calculation')).toBeDefined()

          it 'has a trigger detail', ->
            [survey, row] = buildSurveyWithRow(qtype)
            expect(getDetail(row, 'trigger')).toBeDefined()
    return

  ###############################################################
  # appearance picker: parseAppearanceValue
  ###############################################################
  describe 'parseAppearanceValue', ->
    {parseAppearanceValue} = require('../../jsapp/xlform/src/view.rowDetail')

    it 'empty string → radio-list for select_one', ->
      expect(parseAppearanceValue('', 'select_one')).toEqual { card: 'radio-list', columnCount: null, customText: null }

    it 'empty string → checkbox-list for select_multiple', ->
      expect(parseAppearanceValue('', 'select_multiple')).toEqual { card: 'checkbox-list', columnCount: null, customText: null }

    it 'null → radio-list for select_one', ->
      expect(parseAppearanceValue(null, 'select_one')).toEqual { card: 'radio-list', columnCount: null, customText: null }

    it 'minimal → dropdown', ->
      expect(parseAppearanceValue('minimal', 'select_one')).toEqual { card: 'dropdown', columnCount: null, customText: null }

    it 'columns → columns-buttons, Automatic', ->
      expect(parseAppearanceValue('columns', 'select_one')).toEqual { card: 'columns-buttons', columnCount: null, customText: null }

    it 'columns-4 → columns-buttons, count=4', ->
      expect(parseAppearanceValue('columns-4', 'select_one')).toEqual { card: 'columns-buttons', columnCount: 4, customText: null }

    it 'columns-10 → columns-buttons, count=10', ->
      expect(parseAppearanceValue('columns-10', 'select_one')).toEqual { card: 'columns-buttons', columnCount: 10, customText: null }

    it 'columns-11 → custom (out of range)', ->
      expect(parseAppearanceValue('columns-11', 'select_one')).toEqual { card: 'custom', columnCount: null, customText: 'columns-11' }

    it 'columns no-buttons → columns-labels-only, Automatic', ->
      expect(parseAppearanceValue('columns no-buttons', 'select_one')).toEqual { card: 'columns-labels-only', columnCount: null, customText: null }

    it 'columns-3 no-buttons → columns-labels-only, count=3', ->
      expect(parseAppearanceValue('columns-3 no-buttons', 'select_one')).toEqual { card: 'columns-labels-only', columnCount: 3, customText: null }

    it 'columns-pack → image-grid', ->
      expect(parseAppearanceValue('columns-pack', 'select_one')).toEqual { card: 'image-grid', columnCount: null, customText: null }

    it 'columns-pack no-buttons → image-grid-labels-only', ->
      expect(parseAppearanceValue('columns-pack no-buttons', 'select_one')).toEqual { card: 'image-grid-labels-only', columnCount: null, customText: null }

    it 'likert → likert-scale for select_one', ->
      expect(parseAppearanceValue('likert', 'select_one')).toEqual { card: 'likert-scale', columnCount: null, customText: null }

    it 'likert → custom for select_multiple', ->
      expect(parseAppearanceValue('likert', 'select_multiple')).toEqual { card: 'custom', columnCount: null, customText: 'likert' }

    it 'autocomplete → search', ->
      expect(parseAppearanceValue('autocomplete', 'select_one')).toEqual { card: 'search', columnCount: null, customText: null }

    it 'image-map → hotspot-image', ->
      expect(parseAppearanceValue('image-map', 'select_one')).toEqual { card: 'hotspot-image', columnCount: null, customText: null }

    it 'unrecognised string → custom', ->
      expect(parseAppearanceValue('compact', 'select_one')).toEqual { card: 'custom', columnCount: null, customText: 'compact' }

    it 'wN token is stripped before parsing', ->
      expect(parseAppearanceValue('columns-4 w3', 'select_one')).toEqual { card: 'columns-buttons', columnCount: 4, customText: null }

    it 'bare wN → treated as empty after stripping', ->
      expect(parseAppearanceValue('w3', 'select_one')).toEqual { card: 'radio-list', columnCount: null, customText: null }

    it "'other' → custom with empty customText", ->
      expect(parseAppearanceValue('other', 'select_one')).toEqual { card: 'custom', columnCount: null, customText: '' }

    it 'columns-2 → columns-buttons, count=2 (lower bound)', ->
      expect(parseAppearanceValue('columns-2', 'select_one')).toEqual { card: 'columns-buttons', columnCount: 2, customText: null }

    it 'columns-2 no-buttons → columns-labels-only, count=2 (lower bound)', ->
      expect(parseAppearanceValue('columns-2 no-buttons', 'select_one')).toEqual { card: 'columns-labels-only', columnCount: 2, customText: null }

    it 'columns-1 → custom (below lower bound)', ->
      expect(parseAppearanceValue('columns-1', 'select_one')).toEqual { card: 'custom', columnCount: null, customText: 'columns-1' }

  ###############################################################
  # appearance picker: buildModelValue
  ###############################################################
  describe 'buildModelValue', ->
    {buildModelValue} = require('../../jsapp/xlform/src/view.rowDetail')

    it 'radio-list → empty string', ->
      expect(buildModelValue('radio-list', null, null)).toBe('')

    it 'checkbox-list → empty string', ->
      expect(buildModelValue('checkbox-list', null, null)).toBe('')

    it 'dropdown → minimal', ->
      expect(buildModelValue('dropdown', null, null)).toBe('minimal')

    it 'columns-buttons + null → columns', ->
      expect(buildModelValue('columns-buttons', null, null)).toBe('columns')

    it 'columns-buttons + 4 → columns-4', ->
      expect(buildModelValue('columns-buttons', 4, null)).toBe('columns-4')

    it 'columns-labels-only + null → columns no-buttons', ->
      expect(buildModelValue('columns-labels-only', null, null)).toBe('columns no-buttons')

    it 'columns-labels-only + 6 → columns-6 no-buttons', ->
      expect(buildModelValue('columns-labels-only', 6, null)).toBe('columns-6 no-buttons')

    it 'image-grid → columns-pack', ->
      expect(buildModelValue('image-grid', null, null)).toBe('columns-pack')

    it 'image-grid-labels-only → columns-pack no-buttons', ->
      expect(buildModelValue('image-grid-labels-only', null, null)).toBe('columns-pack no-buttons')

    it 'likert-scale → likert', ->
      expect(buildModelValue('likert-scale', null, null)).toBe('likert')

    it 'search → autocomplete', ->
      expect(buildModelValue('search', null, null)).toBe('autocomplete')

    it 'hotspot-image → image-map', ->
      expect(buildModelValue('hotspot-image', null, null)).toBe('image-map')

    it 'custom with text → raw text', ->
      expect(buildModelValue('custom', null, 'compact')).toBe('compact')

    it 'custom with empty text → other', ->
      expect(buildModelValue('custom', null, '')).toBe('other')

    it 'custom with null text → other', ->
      expect(buildModelValue('custom', null, null)).toBe('other')

  ###############################################################
  # appearance picker: buildPillText
  ###############################################################
  describe 'buildPillText', ->
    {buildPillText} = require('../../jsapp/xlform/src/view.rowDetail')

    it 'radio-list → "Radio list"', ->
      expect(buildPillText('radio-list', null, null)).toBe('Radio list')

    it 'checkbox-list → "Checkbox list"', ->
      expect(buildPillText('checkbox-list', null, null)).toBe('Checkbox list')

    it 'dropdown → "Dropdown"', ->
      expect(buildPillText('dropdown', null, null)).toBe('Dropdown')

    it 'image-grid → "Image grid"', ->
      expect(buildPillText('image-grid', null, null)).toBe('Image grid')

    it 'image-grid-labels-only → "Image grid (labels only)"', ->
      expect(buildPillText('image-grid-labels-only', null, null)).toBe('Image grid (labels only)')

    it 'likert-scale → "Likert scale"', ->
      expect(buildPillText('likert-scale', null, null)).toBe('Likert scale')

    it 'search → "Search"', ->
      expect(buildPillText('search', null, null)).toBe('Search')

    it 'hotspot-image → "Hotspot image"', ->
      expect(buildPillText('hotspot-image', null, null)).toBe('Hotspot image')

    it 'columns-buttons + null → "Columns (buttons) · Automatic"', ->
      expect(buildPillText('columns-buttons', null, null)).toBe('Columns (buttons) · Automatic')

    it 'columns-buttons + 4 → "Columns (buttons) · 4 cols"', ->
      expect(buildPillText('columns-buttons', 4, null)).toBe('Columns (buttons) · 4 cols')

    it 'columns-labels-only + null → "Columns (labels only) · Automatic"', ->
      expect(buildPillText('columns-labels-only', null, null)).toBe('Columns (labels only) · Automatic')

    it 'columns-labels-only + 7 → "Columns (labels only) · 7 cols"', ->
      expect(buildPillText('columns-labels-only', 7, null)).toBe('Columns (labels only) · 7 cols')

    it 'custom with text → "Custom: compact"', ->
      expect(buildPillText('custom', null, 'compact')).toBe('Custom: compact')

    it 'custom with no text → "Custom"', ->
      expect(buildPillText('custom', null, null)).toBe('Custom')
