frappe.ui.form.on('Company', {
    refresh(frm) {
        frm.add_custom_button(__('Fix Null Batch SLEs'), function () {

            // Step 1: Ask for inputs
            const d = new frappe.ui.Dialog({
                title: 'Fix NULL Batch on Stock Ledger Entries',
                fields: [
                    {
                        fieldtype: 'Link',
                        fieldname: 'item_code',
                        label: 'Item Code',
                        options: 'Item',
                        reqd: 1
                    },
                    {
                        fieldtype: 'Link',
                        fieldname: 'warehouse',
                        label: 'Warehouse',
                        options: 'Warehouse',
                        reqd: 1
                    },
                    {
                        fieldtype: 'Link',
                        fieldname: 'batch_no',
                        label: 'Correct Batch No',
                        options: 'Batch',
                        reqd: 1
                    },
                    {
                        fieldtype: 'Small Text',
                        fieldname: 'invoice_list',
                        label: 'Invoice Numbers (comma separated)',
                        reqd: 1,
                        description: 'e.g. INV-2094551, INV-2094552'
                    }
                ],
                primary_action_label: 'Run Fix',
                primary_action(values) {
                    d.hide();

                    const invoices = values.invoice_list
                        .split(',')
                        .map(s => s.trim())
                        .filter(Boolean);

                    frappe.show_progress(
                        'Fixing Batch SLEs',
                        0, 100,
                        'Please wait...'
                    );

                    frappe.call({
                        method: 'klik_pos.overrides.company.fix_null_batch_sles',
                        args: {
                            item_code: values.item_code,
                            warehouse: values.warehouse,
                            batch_no: values.batch_no,
                            invoice_list: JSON.stringify(invoices)
                        },
                        callback(r) {
                            frappe.hide_progress();

                            if (r.exc) {
                                frappe.msgprint({
                                    title: 'Error',
                                    message: r.exc,
                                    indicator: 'red'
                                });
                                return;
                            }

                            const res = r.message;

                            // Build results table
                            let rows = (res.ledger_snapshot || []).map(row =>
                                `<tr>
                                    <td>${row.voucher_no}</td>
                                    <td>${row.posting_date}</td>
                                    <td>${row.batch_no || '<span style="color:red">NULL</span>'}</td>
                                    <td>${row.actual_qty}</td>
                                    <td>${row.qty_after_transaction}</td>
                                </tr>`
                            ).join('');

                            frappe.msgprint({
                                title: 'Fix Complete',
                                indicator: res.repost === 'success' ? 'green' : 'orange',
                                message: `
                                    <b>SLEs fixed:</b> ${res.sles_fixed}<br>
                                    <b>Bundle entries fixed:</b> ${res.bundle_entries_fixed}<br>
                                    <b>Repost:</b> ${res.repost}<br><br>
                                    <b>Ledger Snapshot:</b>
                                    <table class="table table-bordered table-condensed" style="margin-top:10px">
                                        <thead>
                                            <tr>
                                                <th>Voucher</th>
                                                <th>Date</th>
                                                <th>Batch</th>
                                                <th>Qty</th>
                                                <th>Balance</th>
                                            </tr>
                                        </thead>
                                        <tbody>${rows}</tbody>
                                    </table>
                                `
                            });
                        }
                    });
                }
            });

            d.show();
        }, __('Stock Tools'));
    }
});