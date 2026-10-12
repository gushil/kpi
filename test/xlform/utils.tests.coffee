{expect} = require('../helper/fauxChai')
$utils = require("../../jsapp/xlform/src/model.utils")
_ = require('underscore')

pasted = [
            ["list_name", "name", "label", "state", "county"],
            ["state", "texas", "Texas", ""],
            ["state", "washington", "Washington", ""],
            ["county", "king 1", "King", "washington", ""],
            ["county", "pierce", "Pierce", "washington", ""],
            ["county", "king 2", "King", "texas", ""],
            ["county", "cameron", "Cameron", "texas", ""],
            ["city", "dumont", "Dumont", "texas", "king 2"],
            ["city", "finney", "Finney", "texas", "king 2"],
            ["city", "brownsville", "brownsville", "texas", "cameron"],
            ["city", "harlingen", "harlingen", "texas", "cameron"],
            ["city", "seattle", "Seattle", "washington", "king 1"],
            ["city", "redmond", "Redmond", "washington", "king 1"],
            ["city", "tacoma", "Tacoma", "washington", "pierce"],
            ["city", "puyallup", "Puyallup", "washington", "pierce"]
        ].map((r)-> r.join("\t")).join("\n")

expectation = JSON.parse("""
[
    {
        "list_name": "state",
        "name": "texas",
        "label": "Texas"
    },
    {
        "list_name": "state",
        "name": "washington",
        "label": "Washington"
    },
    {
        "list_name": "county",
        "name": "king 1",
        "label": "King",
        "state": "washington"
    },
    {
        "list_name": "county",
        "name": "pierce",
        "label": "Pierce",
        "state": "washington"
    },
    {
        "list_name": "county",
        "name": "king 2",
        "label": "King",
        "state": "texas"
    },
    {
        "list_name": "county",
        "name": "cameron",
        "label": "Cameron",
        "state": "texas"
    },
    {
        "list_name": "city",
        "name": "dumont",
        "label": "Dumont",
        "state": "texas",
        "county": "king 2"
    },
    {
        "list_name": "city",
        "name": "finney",
        "label": "Finney",
        "state": "texas",
        "county": "king 2"
    },
    {
        "list_name": "city",
        "name": "brownsville",
        "label": "brownsville",
        "state": "texas",
        "county": "cameron"
    },
    {
        "list_name": "city",
        "name": "harlingen",
        "label": "harlingen",
        "state": "texas",
        "county": "cameron"
    },
    {
        "list_name": "city",
        "name": "seattle",
        "label": "Seattle",
        "state": "washington",
        "county": "king 1"
    },
    {
        "list_name": "city",
        "name": "redmond",
        "label": "Redmond",
        "state": "washington",
        "county": "king 1"
    },
    {
        "list_name": "city",
        "name": "tacoma",
        "label": "Tacoma",
        "state": "washington",
        "county": "pierce"
    },
    {
        "list_name": "city",
        "name": "puyallup",
        "label": "Puyallup",
        "state": "washington",
        "county": "pierce"
    }
]
""")


do ->
  describe 'model.utils', ->
    describe 'pasted', ->
      _eqKeyVals = (a, b)->
        expect(_.keys(a).sort().join(',')).toEqual(_.keys(b).sort().join(','))
        expect(_.values(a).sort().join(',')).toEqual(_.values(b).sort().join(','))

      it 'splits pasted code into appropriate chunks', ->
        splitted = $utils.split_paste(pasted)
        expect(splitted.length).toEqual(expectation.length)
        for i in [0..splitted.length]
          _eqKeyVals(splitted[i], expectation[i])
        return

    describe 'sluggify', ->
      it 'lowerCases: true', ->
        expect($utils.sluggify("TESTING LOWERCASE TRUE", lowerCase: true)).toEqual('testing_lowercase_true')
      it 'lowerCases: false', ->
        expect($utils.sluggify("TESTING LOWERCASE FALSE", lowerCase: false)).toEqual('TESTING_LOWERCASE_FALSE')
      it 'isValidXmlTag passes with valid strings', ->
        valid_xml = [
          'abc',
          '_123',
          'a456',
          '_.',
        ]
        for str in valid_xml
          expect($utils.isValidXmlTag(str)).toBeTruthy()
        return
      it 'isValidXmlTag fails with invalid strings', ->
        invalid_xml = [
          '1xyz',
          ' startswithspace',
          '._',
        ]
        for str in invalid_xml
          expect($utils.isValidXmlTag(str)).not.toBeTruthy()
        return

      it 'handles a number of strings consistenly', ->
        inp_exps = [
            [["asdf jkl"],              "asdf_jkl"],
            [["asdf", ["asdf"]],        "asdf_001"],
            [["2. asdf"],               "_2_asdf"],
            [["2. asdf", ["_2_asdf"]],  "_2_asdf_001"],
            [["asdf#123"],              "asdf_123"],
            [[" hello "],               "hello"],
        ]
        for [inps, exps], i in inp_exps
          [str, additionals] = inps
          _out = $utils.sluggifyLabel(str, additionals)
          expect(_out).toBe(exps)
        return

do ->
  describe 'model.utils: shouldShowCalculationReadonlyHint', ->
    base = (overrides = {}) ->
      opts =
        questionType: 'text'
        calculation: 'x + 1'
        trigger: ''
        readonly: false
      opts[k] = v for k, v of overrides
      return opts

    it 'AC1: shows for non-calculate item with calc and no trigger', ->
      expect($utils.shouldShowCalculationReadonlyHint(base())).toBe(true)
      return

    it 'AC1: works for other allowed types (select_one, select_multiple, date, integer, decimal)', ->
      for qt in ['select_one', 'select_multiple', 'date', 'integer', 'decimal']
        expect(
          $utils.shouldShowCalculationReadonlyHint(base(questionType: qt))
        ).toBe(true)
      return

    it 'AC1: hidden when calculation is empty', ->
      expect(
        $utils.shouldShowCalculationReadonlyHint(base(calculation: ''))
      ).toBe(false)
      return

    it 'AC1: hidden when calculation is only whitespace', ->
      expect(
        $utils.shouldShowCalculationReadonlyHint(base(calculation: '   '))
      ).toBe(false)
      return

    it 'AC2: hidden for calculate type', ->
      expect(
        $utils.shouldShowCalculationReadonlyHint(base(questionType: 'calculate'))
      ).toBe(false)
      return

    it 'AC3: hidden when a trigger is selected', ->
      expect(
        $utils.shouldShowCalculationReadonlyHint(base(trigger: '${weight}'))
      ).toBe(false)
      return

    it 'clarified: hidden when item is already read-only (boolean true)', ->
      expect(
        $utils.shouldShowCalculationReadonlyHint(base(readonly: true))
      ).toBe(false)
      return

    it 'clarified: hidden for all truthy readonly string values', ->
      for ro in ['true', 'TRUE', 'true()', 'yes', 'YES']
        expect(
          $utils.shouldShowCalculationReadonlyHint(base(readonly: ro))
        ).toBe(false)
      return

    it 'shown when readonly is a falsy string like "no"', ->
      expect(
        $utils.shouldShowCalculationReadonlyHint(base(readonly: 'no'))
      ).toBe(true)
      return

    it 'returns false safely when called with no opts', ->
      expect($utils.shouldShowCalculationReadonlyHint()).toBe(false)
      return

    it 'handles null/undefined calculation and trigger safely', ->
      expect(
        $utils.shouldShowCalculationReadonlyHint(
          base(calculation: null, trigger: null)
        )
      ).toBe(false)
      return
    return

  # OC-28966: expected values come from pyxform's default_is_dynamic
  # (pinned c1ffe27), run on the same inputs.
  describe 'model.utils: isDefaultDynamic', ->
    it 'dynamic: function call, ${ref}, operators, union, predicate', ->
      for v in ['today()', 'concat(\'a\',\'b\')', '${age}', '${last-saved#x}',
                '${age} * 2', '1+1', '5 - 3', '10 div 2', '10 mod 3',
                'a|b', 'x[1]', '-x', '- 5']
        expect([v, $utils.isDefaultDynamic(v)]).toEqual([v, true])
      return

    it 'static: numbers (incl. negative), strings, names, dates, comparisons', ->
      for v in ['5', '-5', '-.5', '5-3', '\'abc\'', '"a+b"', 'foo', 'foo-bar',
                'true', '2020-01-01', '2020-01-01T10:00:00Z', '10:00:00',
                '1 = 1', '/data/x', 'now ()', '', '   ']
        expect([v, $utils.isDefaultDynamic(v)]).toEqual([v, false])
      return

    it 'pyxform lexer quirks: words starting with div/mod are operators', ->
      expect($utils.isDefaultDynamic('divide')).toBe(true)
      expect($utils.isDefaultDynamic('model')).toBe(true)
      return

    # Every default value in pyxform's tests/test_dynamic_default.py (at
    # c1ffe27), with the result pyxform gives for a Calculate item.
    it 'matches pyxform test_dynamic_default.py cases', ->
      cases = [
        ['foo', false]
        ['123', false]
        ['bar123', false]
        ['https://my-site.com', false]
        ['(https://mysite.com)', false]
        ['go to https://mysite.com', false]
        ['Repeat after me: \'~!@#$%^&()_', false]
        ['not_func$', false]
        ['f-g', false]
        ['f-4', false]
        ['./f-4', false]
        ['2022-03-14', false]
        ['-2022-03-14', false]
        ['01:02:55', false]
        ['01:02:55Z', false]
        ['01:02:55+00:00', false]
        ['01:02:55+10:00', false]
        ['01:02:55-07:00', false]
        ['2022-03-14T01:02:55', false]
        ['2022-03-14T01:02:55Z', false]
        ['2022-03-14T01:02:55+00:00', false]
        ['2022-03-14T01:02:55+10:00', false]
        ['2022-03-14T01:02:55-07:00', false]
        ['32.7377112 -117.1288399 14 5.01', false]
        ['random()', true]
        ['ends-with(\'mystr\', "str")', true]
        ['ends-with(../t2, ./t4)', true]
        ['jr:itext(\'/test/ref_text:label\')', true]
        ['if(../t2 = \'test\', 1, 2) + 15 - int(1.2)', true]
        ['1 + decimal-date-time(now())', true]
        ['concat(if(../t1 = "this", \'go\', "to"), "https://mysite.com")', true]
        ['7 - 4', true]
        ['3 mod 3', true]
        ['5 div 5', true]
        ['2 + 3 * 4', true]
        ['5 div 5 - 5', true]
        ['random() + 2 * 5', true]
        ['./f - 4', true]
        ['../t2 - ./t4', true]
        ['1 + 2 - 3 * 4 div 5 mod 6', true]
        ['concat(\'2022-03\', \'-14\')', true]
        ['${ref_text}', true]
        ['${ref_int}', true]
        ['${last-saved#ref_text}', true]
        ['if(${last-saved#ref_int} = \'\', 0, ${last-saved#ref_int} + 1)', true]
        ['../t2 \\| ./t4', true]
        ['random() + 0.5', true]
        ['if( /test/q1  < 1,\'A\',\'B\')', true]
        ['a-2', false]
        ['1-1', false]
        ['a-b', false]
      ]
      for [v, expected] in cases
        expect([v, $utils.isDefaultDynamic(v)]).toEqual([v, expected])
      return

    it 'non-string is not dynamic', ->
      expect($utils.isDefaultDynamic(undefined)).toBe(false)
      expect($utils.isDefaultDynamic(null)).toBe(false)
      return
    return

  describe 'model.utils: isCalculationMissing', ->
    it 'not missing when a calculation is set', ->
      expect($utils.isCalculationMissing('1 + 1', '')).toBe(false)
      expect($utils.isCalculationMissing('1 + 1', '5')).toBe(false)
      return

    it 'not missing with empty calculation and dynamic default', ->
      expect($utils.isCalculationMissing('', 'today()')).toBe(false)
      expect($utils.isCalculationMissing('  ', '${age} * 2')).toBe(false)
      return

    it 'missing with empty calculation and static or empty default', ->
      for d in ['5', '-5', '\'abc\'', '', undefined]
        expect([d, $utils.isCalculationMissing('', d)]).toEqual([d, true])
      expect($utils.isCalculationMissing(undefined, undefined)).toBe(true)
      return
    return

  describe 'model.utils: isHiddenField', ->
    # mirrors the real hiddenFields array in view.row.coffee
    hiddenFields = ['label', 'hint']

    it 'OC-28780: hides an exact match', ->
      expect($utils.isHiddenField('label', hiddenFields)).toBe(true)
      return

    it 'OC-28780: hides a translated variant of a hidden field', ->
      expect($utils.isHiddenField('label::French', hiddenFields)).toBe(true)
      expect($utils.isHiddenField('hint::German (de)', hiddenFields)).toBe(true)
      return

    it 'OC-28780: does not hide an unrelated key', ->
      expect($utils.isHiddenField('constraint_message', hiddenFields)).toBe(false)
      return

    it 'OC-28780: does not hide a key that merely starts with a hidden name', ->
      expect($utils.isHiddenField('labelled', hiddenFields)).toBe(false)
      return

    describe 'translatedOnlyFields', ->
      translatedOnlyFields = ['constraint_message', 'required_message']

      it 'OC-28780: does not hide the bare (primary-language) field', ->
        expect(
          $utils.isHiddenField('constraint_message', hiddenFields, translatedOnlyFields)
        ).toBe(false)
        expect(
          $utils.isHiddenField('required_message', hiddenFields, translatedOnlyFields)
        ).toBe(false)
        return

      it 'OC-28780: hides a translated variant', ->
        expect(
          $utils.isHiddenField('constraint_message::French', hiddenFields, translatedOnlyFields)
        ).toBe(true)
        expect(
          $utils.isHiddenField('required_message::German (de)', hiddenFields, translatedOnlyFields)
        ).toBe(true)
        return

      it 'OC-28780: defaults to no translatedOnlyFields when omitted', ->
        expect($utils.isHiddenField('constraint_message::French', hiddenFields)).toBe(false)
        return
    return
  return
