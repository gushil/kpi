# -*- coding: utf-8 -*-
from django.db.migrations import Migration as DjangoMigration, AlterField
from django.db.models import CharField
from django.contrib.auth import validators
from django.utils import six

class Migration(DjangoMigration):
    dependencies = [
        # Specify other dependencies, if required.
        ('oc_hack', '0001_alter_auth_user_username'),
        ('auth', '0007_alter_validators_add_error_messages'),
        ('auth', '0008_alter_user_username_max_length'),
    ]
    operations = [
        AlterField(
            model_name='User',
            name='username',
            field=CharField(
                error_messages={'unique': 'A user with that username already exists.'},
                help_text='Required. 150 characters or fewer. Letters, digits and @/./+/-/_ only.',
                max_length=150,
                unique=True,
                validators=[validators.UnicodeUsernameValidator() if six.PY3 else validators.ASCIIUsernameValidator()],
                verbose_name='username',
            ),
        )
    ]

    def mutate_state(self, project_state, preserve=True):
        """
        This is a workaround that allows to store ``auth``
        migration outside the directory it should be stored.
        """
        app_label = self.app_label
        self.app_label = 'auth'
        state = super(Migration, self).mutate_state(project_state, preserve)
        self.app_label = app_label
        return state

    def apply(self, project_state, schema_editor, collect_sql=False):
        """
        Same workaround as described in ``mutate_state`` method.
        """
        app_label = self.app_label
        self.app_label = 'auth'
        state = super(Migration, self).apply(project_state, schema_editor, collect_sql)
        self.app_label = app_label
        return state
