# coding: utf-8
import json
from datetime import timedelta

from constance.test import override_config
from django.test import TestCase
from django.utils import timezone

from kobo.apps.kobo_auth.shortcuts import User
from kpi.maintenance_tasks import remove_old_asset_snapshots
from kpi.tests.api.v2 import test_api_asset_snapshots
from ..models import Asset, AssetSnapshot


class AssetSnapshotsTestCase(TestCase):
    fixtures = ['test_data']

    def setUp(self):
        self.user = User.objects.get(username='someuser')
        self.asset = Asset.objects.create(content={'survey': [
            {'type': 'text', 'label': 'Question 1', 'name': 'q1', '$kuid': 'abc'},
            {'type': 'text', 'label': 'Question 2', 'name': 'q2', '$kuid': 'def'},
        ],
            'settings': {},
        }, owner=self.user, asset_type='survey')
        self.asset_snapshot = AssetSnapshot.objects.create(asset=self.asset,
                                                           source=self.asset.content)
        self.sa = self.asset


class CreateAssetSnapshots(AssetSnapshotsTestCase):

    def test_init_asset_snapshot(self):
        ae = AssetSnapshot(asset=self.asset)
        self.assertEqual(ae.asset.id, self.asset.id)

    def test_create_asset_snapshot(self):
        self.asset_snapshot.delete()
        ae_count = AssetSnapshot.objects.count()
        ae = AssetSnapshot.objects.create(asset=self.asset)
        ae_count2 = AssetSnapshot.objects.count()
        self.assertTrue(len(ae.uid) > 0)
        self.assertEqual(ae.source, self.asset.latest_version.version_content)
        self.assertEqual(ae.owner, self.asset.owner)
        self.assertEqual(ae_count + 1, ae_count2)

    def test_create_assetless_snapshot(self):
        asset_snapshot_count = AssetSnapshot.objects.count()
        asset_snapshot = AssetSnapshot.objects.create(
                source=json.loads(test_api_asset_snapshots.
                                  TestAssetSnapshotList.form_source))
        self.assertGreater(len(asset_snapshot.uid), 0)
        self.assertEqual(asset_snapshot_count + 1, AssetSnapshot.objects.count())

    def test_xml_export_auto_title(self):
        content = {'settings': [{'id_string': 'no_title_asset'}],
                   'survey': [{'label': 'Q1 Label.', 'type': 'decimal'}]}
        asset = Asset.objects.create(asset_type='survey', content=content)
        _snapshot = asset.snapshot()
        self.assertEqual(_snapshot.source.get('settings')['form_title'], 'no_title_asset')

    def test_snapshots_allow_choice_duplicates(self):
        """
        Choice duplicates should be allowed here but *not* when deploying
        a survey
        """
        content = {
            'survey': [
                {'type': 'select_multiple',
                 'select_from_list_name': 'xxx',
                 'label': 'pick one'},
            ],
            'choices': [
                {'list_name': 'xxx', 'label': 'ABC', 'name': 'ABC'},
                {'list_name': 'xxx', 'label': 'Also ABC', 'name': 'ABC'},
            ],
            'settings': {},
        }
        snap = AssetSnapshot.objects.create(source=content)
        # pyxform 1.x uses <value> instead of <name> for choice elements
        assert snap.xml.count('<value>ABC</value>') == 2

    def test_mismatched_default_language_is_reported_not_raised(self):
        content = {
            'survey': [
                {
                    'type': 'text',
                    'name': 'q1',
                    'label::English (en)': 'Cheese?',
                },
            ],
            'settings': {'default_language': 'English', 'id_string': 'oc28515'},
        }
        snapshot = AssetSnapshot.objects.create(source=content)
        self.assertEqual(snapshot.xml, '')
        self.assertEqual(snapshot.details['status'], 'failure')
        self.assertEqual(snapshot.details['error_type'], 'ValueError')
        self.assertIn('default language', snapshot.details['error'])
        self.assertIn('English (en)', snapshot.details['error'])

    def test_asset_snapshot_regenerate(self):
        content = {
            'settings': [{'id_string': 'no_title_asset'}],
            'survey': [{'label': 'Q1 Label.', 'type': 'decimal'}],
        }
        asset = Asset.objects.create(asset_type='survey', content=content)
        xml_ = asset.snapshot().xml
        AssetSnapshot.objects.filter(asset_id=asset.pk).update(xml='foo')
        assert xml_ != 'foo'
        assert asset.snapshot().xml == 'foo'
        assert asset.snapshot(regenerate=True).xml == xml_


class AssetSnapshotHousekeeping(AssetSnapshotsTestCase):

    @override_config(ASSET_SNAPSHOT_DAYS_RETENTION=2)
    def test_delete_old_asset_snapshots_task(self):
        # Because of `auto_date_now` , we cannot specify the date with `create()`
        older_snapshot = AssetSnapshot.objects.create(asset=self.asset)
        older_snapshot.date_created = timezone.now() - timedelta(days=5)
        older_snapshot.save(update_fields=['date_created'])
        newer_snapshot = AssetSnapshot.objects.create(asset=self.asset)
        newer_snapshot.date_created = timezone.now() - timedelta(days=4)
        newer_snapshot.save(update_fields=['date_created'])

        remove_old_asset_snapshots()

        # Both are outside retention date, oldest gets removed
        assert AssetSnapshot.objects.filter(pk=newer_snapshot.id).exists()
        assert not AssetSnapshot.objects.filter(pk=older_snapshot.id).exists()

        newest_unversioned_snapshot = AssetSnapshot.objects.create(
            asset=self.asset, source=self.asset.content
        )
        newest_unversioned_snapshot.date_created = timezone.now() - timedelta(
            days=3
        )
        newest_unversioned_snapshot.save(update_fields=['date_created'])

        remove_old_asset_snapshots()

        # Newest still gets deleted because it doesn't have version
        assert AssetSnapshot.objects.filter(pk=newer_snapshot.id).exists()
        assert not AssetSnapshot.objects.filter(
            pk=newest_unversioned_snapshot.id
        ).exists()

        asset_2 = Asset.objects.create(
            content=self.asset.content,
            owner=self.user,
            asset_type='survey',
        )
        asset_2_older_snapshot = AssetSnapshot.objects.create(asset=asset_2)
        asset_2_older_snapshot.date_created = timezone.now() - timedelta(days=1)
        asset_2_older_snapshot.save(update_fields=['date_created'])
        asset_2_newer_snapshot = AssetSnapshot.objects.create(asset=asset_2)

        remove_old_asset_snapshots()

        # Both remain because they are within retention date
        assert AssetSnapshot.objects.filter(
            pk=asset_2_older_snapshot.id
        ).exists()
        assert AssetSnapshot.objects.filter(
            pk=asset_2_newer_snapshot.id
        ).exists()


class MediaColumnLanguageTestCase(TestCase):
    """
    OC-28513: a media column that OC keeps untranslated must be given the
    form's first language before XForm generation. Without it, formpack reads
    the column as untranslated, appends the unnamed language to
    `translations`, and every `label` list is then one entry short.
    """

    fixtures = ['test_data']

    def setUp(self):
        self.user = User.objects.get(username='someuser')

    def _source(self, first_language, media_column='image'):
        label_column = (
            'label' if first_language is None else f'label::{first_language}'
        )
        return {
            'survey': [
                {
                    'type': 'text',
                    'name': 'q1',
                    '$kuid': 'k1',
                    label_column: 'Question 1',
                },
                {
                    'type': 'text',
                    'name': 'q2',
                    '$kuid': 'k2',
                    label_column: 'Question 2',
                    media_column: 'photo.png',
                },
            ],
            'choices': [],
            'settings': {
                'id_string': 'media_language',
                'form_title': 'Media language',
            },
        }

    def _snapshot(self, source):
        return AssetSnapshot.objects.create(owner=self.user, source=source)

    def test_named_first_language_keeps_image_and_generates_xml(self):
        snapshot = self._snapshot(self._source('English (en)'))
        self.assertEqual(snapshot.details['status'], 'success')
        self.assertIn('photo.png', snapshot.xml)

    def test_unnamed_first_language_still_generates_xml(self):
        snapshot = self._snapshot(self._source(None))
        self.assertEqual(snapshot.details['status'], 'success')
        self.assertIn('photo.png', snapshot.xml)

    def test_audio_and_video_columns_get_the_first_language_too(self):
        for media_column in ('audio', 'video'):
            with self.subTest(media_column=media_column):
                snapshot = self._snapshot(
                    self._source('English (en)', media_column=media_column)
                )
                self.assertEqual(snapshot.details['status'], 'success')
                self.assertIn('photo.png', snapshot.xml)

    def test_already_expanded_media_column_keeps_both_languages(self):
        """
        A media column formpack has already expanded into a per-language
        list (its base name is in `translated`) must not be suffixed with
        the first language: that would tell formpack the whole list is one
        filename for that language, stringifying both into a single value.
        """
        source = {
            'survey': [
                {
                    'type': 'text',
                    'name': 'q1',
                    '$kuid': 'k1',
                    'label': ['Question 1', 'Question 1 (fr)'],
                },
                {
                    'type': 'text',
                    'name': 'q2',
                    '$kuid': 'k2',
                    'label': ['Question 2', 'Question 2 (fr)'],
                    'image': ['photo.png', 'photo_fr.png'],
                },
            ],
            'choices': [],
            'translated': ['label', 'image'],
            'translations': ['English (en)', 'French (fr)'],
            'settings': {
                'id_string': 'media_language',
                'form_title': 'Media language',
            },
        }
        snapshot = self._snapshot(source)
        self.assertEqual(snapshot.details['status'], 'success')
        self.assertIn('photo.png', snapshot.xml)
        self.assertIn('photo_fr.png', snapshot.xml)
        self.assertNotIn('photo.pngphoto_fr.png', snapshot.xml)

    def test_prefixed_translated_name_unnamed_language_generates_xml(self):
        """
        OC-28640: a form mixing bare (`image`) and pre-prefixed
        (`media::video`) media headers can end up with `translated` tracking
        the column under its prefixed name while the row still holds a bare
        scalar. With a single unnamed language, that used to fail with
        '"media::image" column is not translated'.
        """
        source = self._source(None)
        source['translated'] = ['label', 'media::image']
        snapshot = self._snapshot(source)
        self.assertEqual(snapshot.details['status'], 'success')
        self.assertIn('photo.png', snapshot.xml)

    def test_prefixed_translated_name_named_languages_generates_xml(self):
        """
        Same mismatch as above, but with two named languages: the scalar
        value must be padded to one entry per language, not just wrapped.
        """
        source = {
            'survey': [
                {
                    'type': 'text',
                    'name': 'q1',
                    '$kuid': 'k1',
                    'label': ['Question 1', 'Question 1 (fr)'],
                },
                {
                    'type': 'text',
                    'name': 'q2',
                    '$kuid': 'k2',
                    'label': ['Question 2', 'Question 2 (fr)'],
                    'image': 'photo.png',
                },
            ],
            'choices': [],
            'translated': ['label', 'media::image'],
            'translations': ['English (en)', 'French (fr)'],
            'settings': {
                'id_string': 'media_language',
                'form_title': 'Media language',
            },
        }
        snapshot = self._snapshot(source)
        self.assertEqual(snapshot.details['status'], 'success')
        self.assertIn('photo.png', snapshot.xml)


class TableListGroupLabelTestCase(TestCase):
    """
    OC-28640: pyxform synthesizes an auto-label note for a `table-list`
    group whenever it merely has a `label`/`hint` key, even an empty one,
    then rejects that note for being blank.
    """

    fixtures = ['test_data']

    def setUp(self):
        self.user = User.objects.get(username='someuser')

    def _source(self, group_label):
        group = {
            'type': 'begin_group',
            'name': 'grp',
            'appearance': 'table-list',
        }
        if group_label is not None:
            group['label'] = group_label
        return {
            'survey': [
                group,
                {'type': 'text', 'name': 'q1', 'label': 'Question 1'},
                {'type': 'end_group'},
            ],
            'choices': [],
            'settings': {
                'id_string': 'table_list_group',
                'form_title': 'Table list group',
            },
        }

    def _snapshot(self, source):
        return AssetSnapshot.objects.create(owner=self.user, source=source)

    def test_empty_label_no_longer_fails(self):
        snapshot = self._snapshot(self._source(''))
        self.assertEqual(snapshot.details['status'], 'success')
        self.assertNotIn('generated_table_list_label', snapshot.xml)

    def test_no_label_key_still_generates_xml(self):
        snapshot = self._snapshot(self._source(None))
        self.assertEqual(snapshot.details['status'], 'success')

    def test_real_label_is_preserved(self):
        snapshot = self._snapshot(self._source('Real Group Label'))
        self.assertEqual(snapshot.details['status'], 'success')
        self.assertIn('Real Group Label', snapshot.xml)
