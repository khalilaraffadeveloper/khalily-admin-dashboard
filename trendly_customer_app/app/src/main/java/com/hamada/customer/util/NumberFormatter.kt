package com.trendly.customer.util

import java.text.DecimalFormat
import java.text.DecimalFormatSymbols
import java.util.Locale

object NumberFormatter {
    private val df = DecimalFormat("#,##0.##", DecimalFormatSymbols(Locale.US))

    fun format(value: Number): String {
        return df.format(value)
    }
}
