const express = require('express');
const router = express.Router();
const { pool } = require('../config/database');

// GET /api/analytics/dashboard - Main dashboard analytics
router.get('/dashboard', async (req, res) => {
    try {
        const { timeframe = '30' } = req.query; // days
        
        // Total leads captured
        const leadsResult = await pool.query(`
            SELECT COUNT(*) as total_leads
            FROM clients 
            WHERE created_at >= NOW() - INTERVAL '${parseInt(timeframe)} days'
        `);

        // Leads by source
        const leadsSourceResult = await pool.query(`
            SELECT source, COUNT(*) as count
            FROM clients 
            WHERE created_at >= NOW() - INTERVAL '${parseInt(timeframe)} days'
            GROUP BY source
            ORDER BY count DESC
        `);

        // Leads by status
        const leadsStatusResult = await pool.query(`
            SELECT status, COUNT(*) as count
            FROM clients 
            WHERE created_at >= NOW() - INTERVAL '${parseInt(timeframe)} days'
            GROUP BY status
            ORDER BY count DESC
        `);

        // Most searched vehicle types
        const vehicleTypesResult = await pool.query(`
            SELECT search_body_type, COUNT(*) as search_count
            FROM client_searches 
            WHERE search_body_type IS NOT NULL 
            AND created_at >= NOW() - INTERVAL '${parseInt(timeframe)} days'
            GROUP BY search_body_type
            ORDER BY search_count DESC
        `);

        // Most searched brands
        const brandsResult = await pool.query(`
            SELECT search_brand, COUNT(*) as search_count
            FROM client_searches 
            WHERE search_brand IS NOT NULL 
            AND created_at >= NOW() - INTERVAL '${parseInt(timeframe)} days'
            GROUP BY search_brand
            ORDER BY search_count DESC
            LIMIT 10
        `);

        // Price range analysis
        const priceAnalysisResult = await pool.query(`
            SELECT 
                AVG(search_min_price) as avg_min_price,
                AVG(search_max_price) as avg_max_price,
                MIN(search_min_price) as lowest_min_price,
                MAX(search_max_price) as highest_max_price
            FROM client_searches 
            WHERE (search_min_price IS NOT NULL OR search_max_price IS NOT NULL)
            AND created_at >= NOW() - INTERVAL '${parseInt(timeframe)} days'
        `);

        // Recent activity (last 24 hours)
        const recentActivityResult = await pool.query(`
            SELECT 
                DATE_TRUNC('hour', created_at) as hour,
                COUNT(*) as activity_count
            FROM client_interactions 
            WHERE created_at >= NOW() - INTERVAL '24 hours'
            GROUP BY DATE_TRUNC('hour', created_at)
            ORDER BY hour DESC
        `);

        // Conversion funnel
        const funnelResult = await pool.query(`
            SELECT 
                COUNT(CASE WHEN status = 'new' THEN 1 END) as new_leads,
                COUNT(CASE WHEN status = 'contacted' THEN 1 END) as contacted,
                COUNT(CASE WHEN status = 'qualified' THEN 1 END) as qualified,
                COUNT(CASE WHEN status = 'sold' THEN 1 END) as sold,
                COUNT(CASE WHEN status = 'lost' THEN 1 END) as lost
            FROM clients 
            WHERE created_at >= NOW() - INTERVAL '${parseInt(timeframe)} days'
        `);

        res.json({
            timeframe: `${timeframe} days`,
            summary: {
                total_leads: parseInt(leadsResult.rows[0].total_leads),
                leads_by_source: leadsSourceResult.rows,
                leads_by_status: leadsStatusResult.rows
            },
            search_analytics: {
                most_searched_types: vehicleTypesResult.rows,
                most_searched_brands: brandsResult.rows,
                price_preferences: priceAnalysisResult.rows[0]
            },
            activity: {
                recent_hourly: recentActivityResult.rows
            },
            conversion_funnel: funnelResult.rows[0]
        });

    } catch (error) {
        console.error('Error fetching dashboard analytics:', error);
        res.status(500).json({ error: 'Error retrieving analytics' });
    }
});

// GET /api/analytics/client-preferences - Detailed client preference analysis
router.get('/client-preferences', async (req, res) => {
    try {
        const { timeframe = '30' } = req.query;

        // Vehicle type preferences by client demographics
        const typePreferencesResult = await pool.query(`
            SELECT 
                preferred_body_type,
                COUNT(*) as client_count,
                AVG(max_price) as avg_budget,
                AVG(max_mileage) as avg_mileage_tolerance
            FROM clients 
            WHERE preferred_body_type IS NOT NULL 
            AND created_at >= NOW() - INTERVAL '${parseInt(timeframe)} days'
            GROUP BY preferred_body_type
            ORDER BY client_count DESC
        `);

        // Brand loyalty analysis
        const brandPreferencesResult = await pool.query(`
            SELECT 
                preferred_brand,
                COUNT(*) as client_count,
                AVG(max_price) as avg_budget
            FROM clients 
            WHERE preferred_brand IS NOT NULL 
            AND created_at >= NOW() - INTERVAL '${parseInt(timeframe)} days'
            GROUP BY preferred_brand
            ORDER BY client_count DESC
        `);

        // Color preferences
        const colorPreferencesResult = await pool.query(`
            SELECT 
                preferred_color,
                COUNT(*) as client_count
            FROM clients 
            WHERE preferred_color IS NOT NULL 
            AND created_at >= NOW() - INTERVAL '${parseInt(timeframe)} days'
            GROUP BY preferred_color
            ORDER BY client_count DESC
        `);

        // Budget analysis
        const budgetAnalysisResult = await pool.query(`
            SELECT 
                CASE 
                    WHEN max_price < 200000 THEN 'Under 200K'
                    WHEN max_price < 400000 THEN '200K-400K'
                    WHEN max_price < 600000 THEN '400K-600K'
                    ELSE 'Over 600K'
                END as budget_range,
                COUNT(*) as client_count,
                AVG(max_price) as avg_budget
            FROM clients 
            WHERE max_price IS NOT NULL 
            AND created_at >= NOW() - INTERVAL '${parseInt(timeframe)} days'
            GROUP BY 
                CASE 
                    WHEN max_price < 200000 THEN 'Under 200K'
                    WHEN max_price < 400000 THEN '200K-400K'
                    WHEN max_price < 600000 THEN '400K-600K'
                    ELSE 'Over 600K'
                END
            ORDER BY AVG(max_price)
        `);

        // Search vs preference correlation
        const correlationResult = await pool.query(`
            SELECT 
                c.preferred_body_type,
                cs.search_body_type,
                COUNT(*) as correlation_count
            FROM clients c
            JOIN client_searches cs ON c.id = cs.client_id
            WHERE c.preferred_body_type IS NOT NULL 
            AND cs.search_body_type IS NOT NULL
            AND c.created_at >= NOW() - INTERVAL '${parseInt(timeframe)} days'
            GROUP BY c.preferred_body_type, cs.search_body_type
            ORDER BY correlation_count DESC
        `);

        res.json({
            timeframe: `${timeframe} days`,
            vehicle_type_preferences: typePreferencesResult.rows,
            brand_preferences: brandPreferencesResult.rows,
            color_preferences: colorPreferencesResult.rows,
            budget_analysis: budgetAnalysisResult.rows,
            preference_search_correlation: correlationResult.rows
        });

    } catch (error) {
        console.error('Error fetching client preferences:', error);
        res.status(500).json({ error: 'Error retrieving client preferences' });
    }
});

// GET /api/analytics/car-performance - Car inventory performance
router.get('/car-performance', async (req, res) => {
    try {
        const { timeframe = '30' } = req.query;

        // Most viewed cars
        const mostViewedResult = await pool.query(`
            SELECT 
                c.id,
                c.brand,
                c.model,
                c.year,
                c.body_type,
                c.price,
                COUNT(cv.id) as view_count
            FROM cars c
            LEFT JOIN car_views cv ON c.id = cv.car_id
            WHERE cv.created_at >= NOW() - INTERVAL '${parseInt(timeframe)} days'
            OR cv.created_at IS NULL
            GROUP BY c.id, c.brand, c.model, c.year, c.body_type, c.price
            ORDER BY view_count DESC
            LIMIT 20
        `);

        // Cars matching client searches but not viewed
        const missedOpportunitiesResult = await pool.query(`
            SELECT 
                c.id,
                c.brand,
                c.model,
                c.year,
                c.body_type,
                c.price,
                COUNT(cs.id) as matching_searches,
                COALESCE(view_counts.view_count, 0) as actual_views
            FROM cars c
            JOIN client_searches cs ON (
                (cs.search_body_type IS NULL OR c.body_type = cs.search_body_type) AND
                (cs.search_brand IS NULL OR LOWER(c.brand) LIKE LOWER('%' || cs.search_brand || '%')) AND
                (cs.search_max_price IS NULL OR c.price <= cs.search_max_price) AND
                (cs.search_min_price IS NULL OR c.price >= cs.search_min_price) AND
                (cs.search_max_mileage IS NULL OR c.mileage <= cs.search_max_mileage)
            )
            LEFT JOIN (
                SELECT car_id, COUNT(*) as view_count
                FROM car_views
                WHERE created_at >= NOW() - INTERVAL '${parseInt(timeframe)} days'
                GROUP BY car_id
            ) view_counts ON c.id = view_counts.car_id
            WHERE cs.created_at >= NOW() - INTERVAL '${parseInt(timeframe)} days'
            AND c.available = true
            GROUP BY c.id, c.brand, c.model, c.year, c.body_type, c.price, view_counts.view_count
            HAVING COUNT(cs.id) > COALESCE(view_counts.view_count, 0)
            ORDER BY (COUNT(cs.id) - COALESCE(view_counts.view_count, 0)) DESC
            LIMIT 10
        `);

        // Price competitiveness analysis
        const priceCompetitivenessResult = await pool.query(`
            SELECT 
                body_type,
                brand,
                AVG(price) as avg_price,
                MIN(price) as min_price,
                MAX(price) as max_price,
                COUNT(*) as inventory_count,
                COUNT(cv.id) as total_views
            FROM cars c
            LEFT JOIN car_views cv ON c.id = cv.car_id 
            AND cv.created_at >= NOW() - INTERVAL '${parseInt(timeframe)} days'
            WHERE c.available = true
            GROUP BY body_type, brand
            ORDER BY body_type, avg_price
        `);

        res.json({
            timeframe: `${timeframe} days`,
            most_viewed_cars: mostViewedResult.rows,
            missed_opportunities: missedOpportunitiesResult.rows,
            price_competitiveness: priceCompetitivenessResult.rows
        });

    } catch (error) {
        console.error('Error fetching car performance analytics:', error);
        res.status(500).json({ error: 'Error retrieving car performance analytics' });
    }
});

// GET /api/analytics/chatbot-effectiveness - Chatbot conversation analysis
router.get('/chatbot-effectiveness', async (req, res) => {
    try {
        const { timeframe = '30' } = req.query;

        // Conversation flow analysis
        const conversationFlowResult = await pool.query(`
            SELECT 
                interaction_type,
                COUNT(*) as interaction_count,
                COUNT(DISTINCT session_id) as unique_sessions
            FROM client_interactions 
            WHERE created_at >= NOW() - INTERVAL '${parseInt(timeframe)} days'
            GROUP BY interaction_type
            ORDER BY interaction_count DESC
        `);

        // Session completion rates
        const completionRatesResult = await pool.query(`
            SELECT 
                COUNT(DISTINCT ci.session_id) as total_sessions,
                COUNT(DISTINCT c.id) as sessions_with_lead,
                ROUND(
                    (COUNT(DISTINCT c.id)::decimal / COUNT(DISTINCT ci.session_id)) * 100, 
                    2
                ) as conversion_rate
            FROM client_interactions ci
            LEFT JOIN clients c ON ci.session_id IN (
                SELECT DISTINCT ci2.session_id 
                FROM client_interactions ci2 
                WHERE ci2.client_id = c.id
            )
            WHERE ci.created_at >= NOW() - INTERVAL '${parseInt(timeframe)} days'
        `);

        // Average session length (number of interactions)
        const sessionLengthResult = await pool.query(`
            SELECT 
                session_id,
                COUNT(*) as interaction_count,
                MAX(created_at) - MIN(created_at) as session_duration
            FROM client_interactions 
            WHERE created_at >= NOW() - INTERVAL '${parseInt(timeframe)} days'
            GROUP BY session_id
            ORDER BY interaction_count DESC
        `);

        // Most common user messages (for training improvement)
        const commonMessagesResult = await pool.query(`
            SELECT 
                user_message,
                COUNT(*) as frequency
            FROM client_interactions 
            WHERE user_message IS NOT NULL 
            AND LENGTH(user_message) > 5
            AND created_at >= NOW() - INTERVAL '${parseInt(timeframe)} days'
            GROUP BY user_message
            ORDER BY frequency DESC
            LIMIT 20
        `);

        const avgSessionLength = sessionLengthResult.rows.length > 0 ? 
            sessionLengthResult.rows.reduce((sum, row) => sum + parseInt(row.interaction_count), 0) / sessionLengthResult.rows.length : 0;

        const avgSessionDuration = sessionLengthResult.rows.length > 0 ?
            sessionLengthResult.rows.reduce((sum, row) => {
                const duration = row.session_duration;
                if (duration) {
                    const match = duration.match(/(\d+):(\d+):(\d+)/);
                    if (match) {
                        return sum + (parseInt(match[1]) * 3600 + parseInt(match[2]) * 60 + parseInt(match[3]));
                    }
                }
                return sum;
            }, 0) / sessionLengthResult.rows.length : 0;

        res.json({
            timeframe: `${timeframe} days`,
            conversation_flow: conversationFlowResult.rows,
            completion_metrics: {
                ...completionRatesResult.rows[0],
                avg_session_length: Math.round(avgSessionLength * 100) / 100,
                avg_session_duration_seconds: Math.round(avgSessionDuration)
            },
            session_analysis: {
                total_sessions: sessionLengthResult.rows.length,
                session_lengths: sessionLengthResult.rows.slice(0, 10) // Top 10 longest sessions
            },
            common_user_messages: commonMessagesResult.rows
        });

    } catch (error) {
        console.error('Error fetching chatbot effectiveness analytics:', error);
        res.status(500).json({ error: 'Error retrieving chatbot analytics' });
    }
});

// GET /api/analytics/trends - Time-based trend analysis
router.get('/trends', async (req, res) => {
    try {
        const { timeframe = '30', granularity = 'day' } = req.query;

        // Validate granularity
        const validGranularities = ['hour', 'day', 'week', 'month'];
        if (!validGranularities.includes(granularity)) {
            return res.status(400).json({ error: 'Invalid granularity. Use: hour, day, week, month' });
        }

        // Leads over time
        const leadsOverTimeResult = await pool.query(`
            SELECT 
                DATE_TRUNC('${granularity}', created_at) as time_period,
                COUNT(*) as lead_count
            FROM clients 
            WHERE created_at >= NOW() - INTERVAL '${parseInt(timeframe)} days'
            GROUP BY DATE_TRUNC('${granularity}', created_at)
            ORDER BY time_period
        `);

        // Searches over time
        const searchesOverTimeResult = await pool.query(`
            SELECT 
                DATE_TRUNC('${granularity}', created_at) as time_period,
                COUNT(*) as search_count
            FROM client_searches 
            WHERE created_at >= NOW() - INTERVAL '${parseInt(timeframe)} days'
            GROUP BY DATE_TRUNC('${granularity}', created_at)
            ORDER BY time_period
        `);

        // Popular search terms over time
        const searchTermTrendsResult = await pool.query(`
            SELECT 
                DATE_TRUNC('${granularity}', created_at) as time_period,
                search_body_type,
                COUNT(*) as search_count
            FROM client_searches 
            WHERE search_body_type IS NOT NULL 
            AND created_at >= NOW() - INTERVAL '${parseInt(timeframe)} days'
            GROUP BY DATE_TRUNC('${granularity}', created_at), search_body_type
            ORDER BY time_period, search_count DESC
        `);

        res.json({
            timeframe: `${timeframe} days`,
            granularity: granularity,
            leads_over_time: leadsOverTimeResult.rows,
            searches_over_time: searchesOverTimeResult.rows,
            search_term_trends: searchTermTrendsResult.rows
        });

    } catch (error) {
        console.error('Error fetching trends analytics:', error);
        res.status(500).json({ error: 'Error retrieving trends analytics' });
    }
});

module.exports = router;