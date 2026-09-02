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

    it 'AC1: works for other allowed types (select_one, date, integer, decimal)', ->
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
  return
