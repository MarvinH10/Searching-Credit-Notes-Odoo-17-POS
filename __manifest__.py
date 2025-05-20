{
    'name': 'POS Searching Credit Notes',
    'version': '1.0',
    'category': 'Point of Sale',
    'sequence': 8,
    'summary': 'Permite validar notas de crédito existentes por Boleta/Factura en el punto de venta.',
    'author': 'Marvin Campos',
    'depends': ['point_of_sale'],
    'data': [
        'security/ir.model.access.csv',
        'views/views.xml',
    ],
    'assets': {
        'point_of_sale._assets_pos': [
            'searching_credit_notes/static/src/**/*',
        ],
    },
    'installable': True,
    'website': '',
    'auto_install': False,
}
